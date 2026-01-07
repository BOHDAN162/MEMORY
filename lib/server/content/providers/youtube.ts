import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmbedding } from "@/lib/server/ai/embeddings";
import type {
  ContentItem,
  ContentProvider,
  ProviderFetchResult,
  ProviderRequest,
} from "../types";

type InterestRow = {
  id: string;
  title: string;
  synonyms: string[] | null;
  cluster?: string | null;
};

type YouTubeSearchItem = {
  id?: { videoId?: string | null } | null;
  snippet?: {
    title?: string | null;
    description?: string | null;
    publishedAt?: string | null;
    channelTitle?: string | null;
    thumbnails?: {
      default?: { url?: string | null } | null;
      medium?: { url?: string | null } | null;
      high?: { url?: string | null } | null;
      standard?: { url?: string | null } | null;
      maxres?: { url?: string | null } | null;
    } | null;
  } | null;
};

type YouTubeSearchResponse = {
  items?: YouTubeSearchItem[];
  error?: unknown;
};

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";

// YouTube L1 settings
const DEFAULT_TOTAL_LIMIT = 20;

// Candidates pool (for semantic ranking)
const PER_INTEREST_CANDIDATES = 20;     // сколько брать на интерес
const MAX_TOTAL_CANDIDATES = 120;       // общий лимит кандидатов, чтобы не взорвать embeddings

// Timeout
const TIMEOUT_MS = 12_000;

// Semantic ranking
const SEMANTIC_TOPK_MULT = 4;           // считаем embeddings для limit*4 кандидатов (после dedupe)
const EMBEDDING_TEXT_MAX_CHARS = 1200;  // режем текст, чтобы не было огромных payload

const pickThumbnail = (item: YouTubeSearchItem): string | null => {
  const thumbs = item.snippet?.thumbnails;
  return (
    thumbs?.high?.url ??
    thumbs?.standard?.url ??
    thumbs?.medium?.url ??
    thumbs?.maxres?.url ??
    thumbs?.default?.url ??
    null
  );
};

const createAbortController = (timeoutMs: number): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
};

const safeTrim = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);

const normalizeWhitespace = (s: string) => s.replace(/\s+/g, " ").trim();

const buildQuery = (interest: InterestRow): string => {
  const synonyms = Array.isArray(interest.synonyms)
    ? interest.synonyms
        .filter((syn) => typeof syn === "string" && syn.trim())
        .slice(0, 2)
    : [];
  // Важно: не делаем слишком длинный q, иначе YouTube начинает “чудить”
  return normalizeWhitespace([interest.title, ...synonyms].join(" "));
};

const fetchInterestRows = async (
  supabase: SupabaseClient,
  interestIds: string[],
): Promise<InterestRow[]> => {
  const { data, error } = await supabase
    .from("interests")
    .select("id, title, synonyms, cluster")
    .in("id", interestIds);

  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[youtube] failed to load interests", error?.message);
    }
    return [];
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    title: row.title,
    synonyms: Array.isArray(row.synonyms) ? row.synonyms : [],
    cluster: row.cluster ?? null,
  }));
};

const fetchYouTube = async (
  query: string,
  limit: number,
  locale: string,
): Promise<{ items: YouTubeSearchItem[]; error: string | null; status?: number }> => {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return { items: [], error: "YOUTUBE_API_KEY is not set" };
  }

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: String(limit),
    q: query,
    safeSearch: "moderate",
    relevanceLanguage: locale,
    regionCode: "RU",
    videoEmbeddable: "true",
    // order=date помогает от “вечной одинаковой выдачи”, особенно на общих запросах
    order: "date",
    key: apiKey,
  });

  const { signal, cleanup } = createAbortController(TIMEOUT_MS);

  try {
    const response = await fetch(`${YOUTUBE_API_URL}?${params.toString()}`, {
      method: "GET",
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    cleanup();

    if (!response.ok) {
      let body = "";
      try {
        body = await response.text();
      } catch {
        // ignore
      }
      return {
        items: [],
        error: `YouTube request failed: ${response.status} ${response.statusText}${body ? ` | ${body.slice(0, 200)}` : ""}`,
        status: response.status,
      };
    }

    const payload = (await response.json()) as YouTubeSearchResponse;
    const items = Array.isArray(payload.items) ? payload.items : [];
    return { items, error: null, status: response.status };
  } catch (error) {
    cleanup();
    return { items: [], error: `YouTube fetch error: ${(error as Error)?.message ?? String(error)}` };
  }
};

const normalizeItem = (
  item: YouTubeSearchItem,
  interest: InterestRow,
  query: string,
): ContentItem | null => {
  const videoId = item.id?.videoId;
  if (!videoId) return null;

  const title = item.snippet?.title ?? "Видео";
  const description = item.snippet?.description ?? null;
  const channelTitle = item.snippet?.channelTitle ?? null;
  const publishedAt = item.snippet?.publishedAt ?? null;
  const thumbnail = pickThumbnail(item);

  return {
    id: `youtube:${videoId}`,
    provider: "youtube",
    type: "video",
    title,
    description,
    image: thumbnail,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    interestIds: [interest.id],
    why: `Видео по интересу “${interest.title}”`,
    score: 0, // score позже зададим семантикой
    meta: {
      channelTitle,
      publishedAt,
      interestId: interest.id,
      interestTitle: interest.title,
      query,
    },
  };
};

const cosineSimilarity = (a: number[], b: number[]): number => {
  const minLen = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < minLen; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const buildQueryTextForEmbedding = (interests: InterestRow[]): string => {
  // Формируем “смысловой запрос”
  // Важно: коротко, но информативно.
  const parts = interests.map((i) => {
    const syn = Array.isArray(i.synonyms) ? i.synonyms.filter(Boolean).slice(0, 4) : [];
    const cluster = i.cluster ? `кластер: ${i.cluster}` : "";
    const synText = syn.length ? `синонимы: ${syn.join(", ")}` : "";
    return normalizeWhitespace([`интерес: ${i.title}`, synText, cluster].filter(Boolean).join(". "));
  });
  return parts.join(" | ");
};

const buildVideoTextForEmbedding = (item: ContentItem): string => {
  const meta = (item.meta ?? {}) as Record<string, unknown>;
  const channel = typeof meta.channelTitle === "string" ? meta.channelTitle : "";
  const title = item.title ?? "";
  const desc = item.description ?? "";
  const combined = normalizeWhitespace(`Видео: ${title}. Канал: ${channel}. Описание: ${desc}`);
  return safeTrim(combined, EMBEDDING_TEXT_MAX_CHARS);
};

const youtubeProvider: ContentProvider = {
  id: "youtube",
  ttlSeconds: 60 * 60 * 6, // 6 часов. Стабильнее, меньше “дергания”
  async fetch(req: ProviderRequest): Promise<ProviderFetchResult> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return { items: [], error: "Supabase client is not configured" };
    }

    const interestIds = Array.from(new Set(req.interestIds.filter(Boolean)));
    if (interestIds.length === 0) return { items: [], error: null };

    const interests = await fetchInterestRows(supabase, interestIds);
    if (interests.length === 0) {
      return { items: [], error: "Failed to load interests (RLS or query error)" };
    }

    const totalLimit = Math.max(1, Math.min(req.limit ?? DEFAULT_TOTAL_LIMIT, DEFAULT_TOTAL_LIMIT));
    const locale = req.locale ?? "ru";

    // 1) Собираем кандидатов (широкая воронка)
    const byVideoId = new Map<string, ContentItem>();

    // Чтобы не взрывать лимиты — ограничим число интересов, по которым “копаем” глубоко
    // (если интересов слишком много — берём первые N)
    const maxInterestsForYoutube = Math.min(interests.length, Math.max(1, Math.ceil(MAX_TOTAL_CANDIDATES / PER_INTEREST_CANDIDATES)));
    const interestsForFetch = interests.slice(0, maxInterestsForYoutube);

    for (const interest of interestsForFetch) {
      const query = buildQuery(interest);
      const { items, error } = await fetchYouTube(query, PER_INTEREST_CANDIDATES, locale);

      // Ключевая стабильность:
      // если YouTube отдал ошибку — мы возвращаем error, чтобы движок НЕ закешировал пустое.
      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[youtube] provider error", { error, query });
        }
        return { items: [], error };
      }

      for (const rawItem of items) {
        const normalized = normalizeItem(rawItem, interest, query);
        if (!normalized) continue;

        const existing = byVideoId.get(normalized.id);
        if (existing) {
          // мерджим interestIds
          const mergedInterestIds = Array.from(
            new Set([...(existing.interestIds ?? []), ...normalized.interestIds]),
          );
          byVideoId.set(normalized.id, {
            ...existing,
            interestIds: mergedInterestIds,
            meta: {
              ...(existing.meta ?? {}),
              ...(normalized.meta ?? {}),
              interestIds: mergedInterestIds,
            },
          });
          continue;
        }

        byVideoId.set(normalized.id, normalized);
        if (byVideoId.size >= MAX_TOTAL_CANDIDATES) break;
      }

      if (byVideoId.size >= MAX_TOTAL_CANDIDATES) break;
    }

    const candidates = Array.from(byVideoId.values());

    // Если кандидатов ноль — это тоже “стабильностный” кейс:
    // не кэшируем пустоту, пусть движок не записывает это.
    if (candidates.length === 0) {
      return { items: [], error: "YouTube returned 0 candidates (avoid caching empty)" };
    }

    // 2) Level 2: Semantic ranking (embeddings)
    // Берем только topK для embeddings, чтобы не жечь токены
    const topKForEmbeddings = Math.min(candidates.length, Math.max(totalLimit * SEMANTIC_TOPK_MULT, 40));
    const embedCandidates = candidates.slice(0, topKForEmbeddings);

    const queryText = buildQueryTextForEmbedding(interests);
    const queryEmbedding = await getEmbedding(queryText);
    if (!queryEmbedding) {
      // если embedding недоступен — не ломаем выдачу, просто вернем L1 кандидатов
      const fallbackItems = candidates.slice(0, totalLimit).map((it, idx) => ({ ...it, score: 1 - idx * 0.001 }));
      return { items: fallbackItems, error: null };
    }

    const scored: Array<{ item: ContentItem; score: number }> = [];

    for (const item of embedCandidates) {
      const text = buildVideoTextForEmbedding(item);
      const emb = await getEmbedding(text);
      if (!emb) continue;
      const sim = cosineSimilarity(queryEmbedding, emb);
      scored.push({ item, score: sim });
    }

    if (scored.length === 0) {
      // опять же: не кэшируем пустоту, но возвращаем хоть что-то
      const fallbackItems = candidates.slice(0, totalLimit).map((it, idx) => ({ ...it, score: 1 - idx * 0.001 }));
      return { items: fallbackItems, error: null };
    }

    const finalItems = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, totalLimit)
      .map(({ item, score }) => ({
        ...item,
        score,
        why:
          typeof item.meta === "object" && item.meta && "interestTitle" in item.meta
            ? `Релевантно по смыслу интересу “${(item.meta as any).interestTitle}”`
            : item.why,
      }));

    if (process.env.NODE_ENV !== "production") {
      console.info("[youtube] semantic ok", {
        interests: interests.length,
        fetchedInterests: interestsForFetch.length,
        candidates: candidates.length,
        embedded: embedCandidates.length,
        returned: finalItems.length,
      });
    }

    return { items: finalItems, error: null };
  },
};

export default youtubeProvider;
