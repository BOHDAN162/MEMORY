import "server-only";

import { z } from "zod";
import { getLLMApiKey } from "@/lib/config/env";

type RerankDebug =
  | { usedModel: string | null; mode: "llm"; error?: undefined }
  | { usedModel: string | null; mode: "mixed" | "heuristic"; error: string };

export type RerankCandidate = {
  id: string;
  title: string;
  description?: string | null;
  provider: string;
  type: string;
  url?: string | null;
  channelTitle?: string | null;
};

export type RerankResult = {
  id: string;
  score: number;
  isAd: boolean;
  isOfftopic: boolean;
  reason: string | null;
};

export const RESPONSE_SCHEMA = z.object({
  id: z.string(),
  score: z.number().min(0).max(1),
  is_ad: z.boolean().optional(),
  is_offtopic: z.boolean().optional(),
  reason: z.string().nullable().optional(),
});

export const RERANK_BATCH_SCHEMA = z.array(RESPONSE_SCHEMA);

const AD_HEURISTICS = [/вебинар/i, /митап/i, /регистрация/i, /скидка/i, /купон/i, /приглашаем/i, /промокод/i];

const buildPrompt = (interests: string[], candidates: RerankCandidate[]): string => {
  const interestText = interests.length > 0 ? interests.join("; ") : "пользовательские интересы не заданы";
  const items = candidates
    .map(
      (c) =>
        `- id: ${c.id}\n  title: ${c.title}\n  description: ${c.description ?? ""}\n  provider: ${c.provider}\n  type: ${c.type}\n  channel: ${c.channelTitle ?? ""}\n  url: ${c.url ?? ""}`,
    )
    .join("\n");

  return [
    "Ты — ранкер контента. Твоя задача: оценить релевантность кандидатов интересам пользователя.",
    "Верни строгий JSON-массив без текста. Формат элемента: {id, score (0..1), is_ad (bool), is_offtopic (bool), reason (string)}.",
    "Правила:",
    "- Ставь is_ad=true если это реклама, приглашения, скидки, митапы, вебинары, вакансии.",
    "- Ставь is_offtopic=true если не связано по смыслу с интересами.",
    "- score выше для точного попадания в интересы; штрафуй за оффтоп и рекламу.",
    "- Не придумывай id — используй те, что в списке.",
    `Интересы: ${interestText}`,
    "Кандидаты:",
    items,
  ].join("\n");
};

export const parseModelJson = (content: string): unknown => {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(withoutFence);
};

const requestLLM = async (prompt: string, apiKey: string): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Ты отвечаешь ТОЛЬКО JSON-массивом без комментариев, оберток или текста. Никаких объектов-оберток.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const message = (await response.text().catch(() => response.statusText)) ?? response.statusText;
    throw new Error(`LLM rerank failed: ${message}`);
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty content");
  return parseModelJson(content);
};

const heuristicScore = (candidate: RerankCandidate, interests: string[]): RerankResult => {
  const title = candidate.title.toLowerCase();
  const desc = (candidate.description ?? "").toLowerCase();
  const combined = `${title} ${desc}`;

  const isAd = AD_HEURISTICS.some((r) => r.test(combined));
  const isOfftopic =
    interests.length > 0 &&
    !interests.some((interest) => combined.includes(interest.toLowerCase()));

  let score = 0.4;
  if (!isOfftopic) score += 0.3;
  if (isAd) score -= 0.2;
  return {
    id: candidate.id,
    score: Math.max(0, Math.min(1, score)),
    isAd,
    isOfftopic,
    reason: null,
  };
};

export const rerank = async (
  interests: string[],
  candidates: RerankCandidate[],
): Promise<{ results: RerankResult[]; debug: RerankDebug }> => {
  const apiKey = getLLMApiKey();
  if (!apiKey) {
    const reason = "LLM key missing, used heuristic rerank";
    if (process.env.NODE_ENV !== "production") {
      console.debug("[ai][rerank] fallback to heuristic - no API key configured");
    }
    return {
      results: candidates.map((c) => heuristicScore(c, interests)),
      debug: { usedModel: null, mode: "heuristic", error: reason },
    };
  }

  const batches: RerankResult[] = [];
  let error: string | undefined;
  let usedFallback = false;
  for (let i = 0; i < candidates.length; i += 10) {
    const slice = candidates.slice(i, i + 10);
    const prompt = buildPrompt(interests, slice);
    try {
      const raw = await requestLLM(prompt, apiKey);
      const parsed = RERANK_BATCH_SCHEMA.parse(raw);
      parsed.forEach((item) => {
        batches.push({
          id: item.id,
          score: item.score,
          isAd: item.is_ad ?? false,
          isOfftopic: item.is_offtopic ?? false,
          reason: item.reason ?? null,
        });
      });
    } catch (err) {
      usedFallback = true;
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ai][rerank] failed, fallback to heuristic", (err as Error)?.message ?? err);
      }
      error = error ?? ((err as Error)?.message ?? "Unknown rerank error");
      slice.forEach((c) => batches.push(heuristicScore(c, interests)));
    }
  }

  const debug: RerankDebug = usedFallback
    ? {
        usedModel: process.env.LLM_MODEL ?? "gpt-4o-mini",
        mode: "mixed",
        error: error ?? "Unknown rerank error",
      }
    : { usedModel: process.env.LLM_MODEL ?? "gpt-4o-mini", mode: "llm" };

  if (process.env.NODE_ENV !== "production") {
    console.debug("[ai][rerank] mode:", debug.mode, debug.error ? `reason=${debug.error}` : "");
  }

  return { results: batches, debug };
};
