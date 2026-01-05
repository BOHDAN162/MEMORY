import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmbedding } from "@/lib/server/ai/embeddings";
import { rerank, type RerankCandidate } from "@/lib/server/ai/rerank";
import { getEmbeddingApiKey, getLLMApiKey } from "@/lib/config/env";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getCached, setCached, stableHash } from "./cache";
import { getProviders } from "./providers";
import type {
  ContentItem,
  ContentProviderId,
  ProviderFetchResult,
  ProviderRequest,
} from "./types";

type ProviderDebugInfo = {
  count: number;
  cacheHit: boolean;
  ms: number;
  error: string | null;
};

export type ContentEngineDebug = {
  cacheHits: Partial<Record<ContentProviderId, boolean>>;
  usedProviders: ContentProviderId[];
  hashes: Partial<Record<ContentProviderId, string>>;
  providers: Partial<Record<ContentProviderId, ProviderDebugInfo>>;
  ingestion?: { upserted: number; updated: number; error?: string | null };
  embeddings?: {
    interestMissing: number;
    contentMissing: number;
    usedModel: string | null;
    error?: string | null;
  };
  semantic?: { topK: number; latencyMs: number; usedModel: string | null; cacheHit?: boolean };
  llm?: {
    filteredAd: number;
    filteredOfftopic: number;
    avgScore: number | null;
    latencyMs: number;
    usedModel: string | null;
    mode?: "llm" | "heuristic" | "fallback";
    error?: string | null;
  };
};

const DEFAULT_TOP_K = 60;
const DIVERSITY_PROVIDER_MAX_STREAK = 2;
const DIVERSITY_CHANNEL_MAX_STREAK = 1;
const DIVERSITY_MIN_PROVIDER_VARIETY = 3;
const BLACKLIST_DOMAINS = ["t.me/joinchat", "meetup", "eventbrite", "webinar"];
const AD_PATTERNS = [/вебинар/i, /митап/i, /регистрация/i, /скидка/i, /купон/i, /приглашаем/i, /промокод/i];

type InterestRow = {
  id: string;
  title: string;
  synonyms: string[] | null;
  cluster: string | null;
};

type CatalogRow = {
  id: string;
  provider: string;
  provider_item_id: string;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  image: string | null;
  language: string | null;
  country: string | null;
  source: string | null;
  channel_title: string | null;
  published_at: string | null;
  meta: Record<string, unknown> | null;
};

const normalizeInterestIds = (interestIds: string[]) =>
  Array.from(new Set(interestIds.filter(Boolean))).sort((a, b) => a.localeCompare(b));

const normalizeText = (value: string | null | undefined) => (value ?? "").trim();

const buildInterestEmbeddingText = (interest: InterestRow): string => {
  const synonyms = Array.isArray(interest.synonyms) ? interest.synonyms.filter(Boolean) : [];
  const cluster = interest.cluster ? `Cluster: ${interest.cluster}.` : "";
  const synonymText = synonyms.length > 0 ? `Synonyms: ${synonyms.join(", ")}.` : "";
  return `Interest: ${interest.title}. ${synonymText} ${cluster}`.trim();
};

const deriveProviderItemId = (item: ContentItem): string => {
  if (item.id.includes(":")) {
    const [, ...rest] = item.id.split(":");
    const candidate = rest.join(":");
    if (candidate) return candidate;
  }
  return item.id;
};

const heuristicAd = (title: string, description: string | null): boolean => {
  const combined = `${title} ${description ?? ""}`;
  if (BLACKLIST_DOMAINS.some((d) => combined.toLowerCase().includes(d))) return true;
  return AD_PATTERNS.some((r) => r.test(combined));
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

const createAbort = (timeoutMs: number): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
};

const fetchInterests = async (
  supabase: SupabaseClient,
  interestIds: string[],
): Promise<InterestRow[]> => {
  const { data, error } = await supabase
    .from("interests")
    .select("id, title, synonyms, cluster")
    .in("id", interestIds);

  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[content-engine] failed to load interests", error?.message);
    }
    return [];
  }

  return data as InterestRow[];
};

const fetchInterestTitleMap = async (
  supabase: SupabaseClient | null,
  interestIds: string[],
): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  if (!supabase || interestIds.length === 0) return map;

  const { data, error } = await supabase
    .from("interests")
    .select("id, title")
    .in("id", interestIds);

  if (error || !data) return map;
  data.forEach((row) => {
    if (row.id && row.title) map.set(row.id, row.title);
  });
  return map;
};

const fetchProviderItems = async (
  providerIds: ContentProviderId[] | undefined,
  request: ProviderRequest,
  supabase: SupabaseClient | null,
): Promise<{ items: ContentItem[]; debug: ContentEngineDebug }> => {
  const providers = getProviders(providerIds);
  const debug: ContentEngineDebug = {
    cacheHits: {},
    usedProviders: providers.map((p) => p.id),
    hashes: {},
    providers: {},
  };

  const itemsWithOrder: Array<{ item: ContentItem; order: number }> = [];

  for (const provider of providers) {
    const providerStatus: ProviderDebugInfo = {
      count: 0,
      cacheHit: false,
      ms: 0,
      error: null,
    };
    const startedAt = Date.now();

    const defaultHashInput =
      provider.id === "youtube"
        ? JSON.stringify({
            provider: "youtube",
            interestIds: request.interestIds,
            limit: request.limit,
            locale: request.locale,
            mode: request.mode,
          })
        : {
            v: 1,
            provider: provider.id,
            interestIds: request.interestIds,
            limit: request.limit ?? null,
            locale: request.locale ?? null,
            mode: request.mode ?? null,
          };

    let hashInput: object | string = defaultHashInput;

    if (provider.getHashInput) {
      try {
        const customHashInput = await provider.getHashInput(request);
        if (customHashInput) hashInput = customHashInput as object | string;
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error(`[content] provider ${provider.id} getHashInput failed`, error);
        }
      }
    }

    const hash = stableHash(hashInput);
    debug.hashes[provider.id] = hash;

    const cached = await getCached(supabase, provider.id, hash, provider.ttlSeconds);
    if (cached) {
      debug.cacheHits[provider.id] = true;
      providerStatus.cacheHit = true;
      providerStatus.count = cached.length;
      providerStatus.ms = Date.now() - startedAt;
      const baseOrder = itemsWithOrder.length;
      cached.forEach((item, index) => itemsWithOrder.push({ item, order: baseOrder + index }));
      debug.providers[provider.id] = providerStatus;
      continue;
    }

    debug.cacheHits[provider.id] = false;

    let providerItems: ContentItem[] = [];
    let providerError: string | null = null;

    try {
      const result = (await provider.fetch(request)) as ProviderFetchResult | ContentItem[];
      const normalizedResult = Array.isArray(result)
        ? { items: result, error: null }
        : { items: result.items ?? [], error: result.error ?? null };
      providerItems = normalizedResult.items;
      providerError = normalizedResult.error;
    } catch (error) {
      providerError = (error as Error)?.message ?? "Unknown provider error";
      if (process.env.NODE_ENV !== "production") {
        console.error(`[content] provider ${provider.id} failed`, error);
      }
    }

    providerStatus.ms = Date.now() - startedAt;
    providerStatus.count = providerItems.length;
    providerStatus.error = providerError;
    debug.providers[provider.id] = providerStatus;

    if (!providerError) {
      await setCached(supabase, provider.id, hash, providerItems);
    }
    const baseOrder = itemsWithOrder.length;
    providerItems.forEach((item, index) => itemsWithOrder.push({ item, order: baseOrder + index }));
  }

  const items = itemsWithOrder
    .sort((a, b) => {
      const aScore = a.item.score;
      const bScore = b.item.score;
      if (aScore != null && bScore != null) {
        if (aScore === bScore) return a.order - b.order;
        return bScore - aScore;
      }
      if (aScore != null) return -1;
      if (bScore != null) return 1;
      return a.order - b.order;
    })
    .map(({ item }) => item);

  return { items, debug };
};

const upsertCatalog = async (
  supabase: SupabaseClient,
  items: ContentItem[],
): Promise<{ rows: CatalogRow[]; upserted: number; updated: number }> => {
  if (items.length === 0) return { rows: [], upserted: 0, updated: 0 };

  const rows = items.map((item) => ({
    provider: item.provider,
    provider_item_id: deriveProviderItemId(item),
    type: item.type,
    title: item.title,
    description: item.description ?? null,
    url: item.url ?? null,
    image: item.image ?? null,
    language: (item.meta as { language?: string })?.language ?? null,
    country: (item.meta as { country?: string })?.country ?? null,
    source: (item.meta as { source?: string })?.source ?? null,
    channel_title: (item.meta as { channelTitle?: string })?.channelTitle ?? null,
    published_at: (item.meta as { publishedAt?: string })?.publishedAt ?? null,
    meta: {
      ...(item.meta ?? {}),
      interest_ids: item.interestIds ?? [],
    },
  }));

  const { data, error } = await supabase
    .from("content_catalog")
    .upsert(rows, { onConflict: "provider,provider_item_id" })
    .select();

  if (error) {
    throw new Error(error.message);
  }

  const returned = (data ?? []) as CatalogRow[];
  return {
    rows: returned,
    upserted: returned.length,
    updated: 0,
  };
};

const ensureInterestEmbeddings = async (
  supabase: SupabaseClient,
  interests: InterestRow[],
): Promise<{ embeddings: Record<string, number[]>; missing: number; usedModel: string | null; error?: string | null }> => {
  const ids = interests.map((i) => i.id);
  const { data, error } = await supabase
    .from("interest_embeddings")
    .select("interest_id, embedding_json, embedding_model")
    .in("interest_id", ids);

  const existing: Record<string, number[]> = {};
  if (!error && data) {
    data.forEach((row) => {
      const vector = (row as { embedding_json?: number[] | null }).embedding_json;
      if (Array.isArray(vector)) {
        existing[(row as { interest_id: string }).interest_id] = vector;
      }
    });
  }

  const missingInterests = interests.filter((i) => !existing[i.id]);
  const usedModel = getEmbeddingApiKey() ? process.env.EMBEDDING_MODEL ?? "text-embedding-3-small" : null;

  for (const interest of missingInterests) {
    const vector = await getEmbedding(buildInterestEmbeddingText(interest));
    if (!vector) continue;
    await supabase
      .from("interest_embeddings")
      .upsert({
        interest_id: interest.id,
        embedding_json: vector,
        embedding_model: usedModel,
      })
      .eq("interest_id", interest.id);
    existing[interest.id] = vector;
  }

  return { embeddings: existing, missing: missingInterests.length, usedModel };
};

const ensureContentEmbeddings = async (
  supabase: SupabaseClient,
  catalogRows: CatalogRow[],
): Promise<{ embeddings: Record<string, number[]>; missing: number; usedModel: string | null }> => {
  if (catalogRows.length === 0) return { embeddings: {}, missing: 0, usedModel: null };
  const ids = catalogRows.map((r) => r.id);
  const { data, error } = await supabase
    .from("content_embeddings")
    .select("content_id, embedding_json, embedding_model")
    .in("content_id", ids);

  const existing: Record<string, number[]> = {};
  if (!error && data) {
    data.forEach((row) => {
      const vector = (row as { embedding_json?: number[] | null }).embedding_json;
      if (Array.isArray(vector)) existing[(row as { content_id: string }).content_id] = vector;
    });
  }

  const missing = catalogRows.filter((row) => !existing[row.id]);
  const usedModel = getEmbeddingApiKey() ? process.env.EMBEDDING_MODEL ?? "text-embedding-3-small" : null;

  for (const row of missing) {
    const textParts = [
      row.title,
      row.description ?? "",
      row.channel_title ?? "",
      row.source ?? "",
    ]
      .filter(Boolean)
      .join(". ");
    const vector = await getEmbedding(textParts);
    if (!vector) continue;
    await supabase.from("content_embeddings").upsert({
      content_id: row.id,
      embedding_json: vector,
      embedding_model: usedModel,
    });
    existing[row.id] = vector;
  }

  return { embeddings: existing, missing: missing.length, usedModel };
};

const semanticRetrieve = (
  query: number[],
  embeddings: Record<string, number[]>,
  catalogRows: CatalogRow[],
  providerFilter?: ContentProviderId[],
): { row: CatalogRow; score: number }[] => {
  const results: { row: CatalogRow; score: number }[] = [];
  for (const row of catalogRows) {
    if (providerFilter && providerFilter.length > 0 && !providerFilter.includes(row.provider as ContentProviderId)) {
      continue;
    }
    const vector = embeddings[row.id];
    if (!vector) continue;
    const sim = cosineSimilarity(query, vector);
    results.push({ row, score: sim });
  }

  return results.sort((a, b) => b.score - a.score);
};

const applyDiversity = (
  candidates: Array<{ item: ContentItem; score: number }>,
  limit: number,
): { items: ContentItem[]; droppedProvider: number; droppedChannel: number; enforcedProviders: number } => {
  const result: ContentItem[] = [];
  let droppedProvider = 0;
  let droppedChannel = 0;

  const providerStreak: Record<string, number> = {};
  const channelStreak: Record<string, number> = {};

  const providerSet = new Set<string>();

  for (const candidate of candidates) {
    const provider = candidate.item.provider;
    const meta = (candidate.item.meta as { channelTitle?: unknown; channel_title?: unknown }) ?? {};
    const channelTitle =
      typeof meta.channelTitle === "string"
        ? meta.channelTitle
        : typeof meta.channel_title === "string"
          ? meta.channel_title
          : null;

    const providerCount = providerStreak[provider] ?? 0;
    const channelCount = channelTitle ? channelStreak[channelTitle] ?? 0 : 0;

    if (providerCount >= DIVERSITY_PROVIDER_MAX_STREAK) {
      droppedProvider += 1;
      continue;
    }
    if (channelTitle && channelCount >= DIVERSITY_CHANNEL_MAX_STREAK) {
      droppedChannel += 1;
      continue;
    }

    result.push(candidate.item);
    providerStreak[provider] = providerCount + 1;
    if (channelTitle) channelStreak[channelTitle] = channelCount + 1;
    providerSet.add(provider);
    if (result.length >= limit) break;
  }

  return {
    items: result,
    droppedProvider,
    droppedChannel,
    enforcedProviders: providerSet.size,
  };
};

const hydrateContentItems = (
  rows: CatalogRow[],
  interestMap: Map<string, string>,
  interestIds: string[],
): ContentItem[] => {
  return rows.map((row) => {
    const meta = (row.meta as Record<string, unknown>) ?? {};
    const rawInterestIds = (meta as { interest_ids?: unknown }).interest_ids;
    const interestIdsFromMeta = Array.isArray(rawInterestIds)
      ? (rawInterestIds as string[])
      : null;
    const interestTitles =
      Array.isArray(interestIdsFromMeta) && interestIdsFromMeta.length > 0
        ? interestIdsFromMeta
            .map((id) => interestMap.get(id))
            .filter((val): val is string => Boolean(val))
        : interestIds.map((id) => interestMap.get(id)).filter((val): val is string => Boolean(val));

    return {
      id: `${row.provider}:${row.provider_item_id}`,
      provider: row.provider as ContentProviderId,
      type: row.type as ContentItem["type"],
      title: row.title,
      description: row.description ?? undefined,
      url: row.url,
      image: row.image ?? undefined,
      meta: {
        ...meta,
        channelTitle: row.channel_title ?? (meta as { channelTitle?: string }).channelTitle,
        publishedAt: row.published_at ?? (meta as { publishedAt?: string }).publishedAt,
        source: row.source ?? (meta as { source?: string }).source,
      },
      interestIds: interestIdsFromMeta ?? interestIds,
      interestTitles,
    };
  });
};

const legacyFallback = async (
  params: {
    providerIds?: ContentProviderId[];
    interestIds: string[];
    limit: number;
    locale: string;
    mode: "selected" | "all";
  },
  supabase: SupabaseClient | null,
): Promise<{ items: ContentItem[]; debug: ContentEngineDebug }> => {
  const { items, debug } = await fetchProviderItems(params.providerIds, params, supabase);
  const interestTitleMap = await fetchInterestTitleMap(supabase, params.interestIds);
  const enrichedItems = items.map((item) => {
    const titles = item.interestIds
      .map((id) => interestTitleMap.get(id))
      .filter((title): title is string => Boolean(title));
    return titles.length > 0 ? { ...item, interestTitles: titles } : item;
  });
  debug.fallback = { reason: "Semantic pipeline unavailable, served provider merge" };
  return { items: enrichedItems, debug };
};

export const runContentEngine = async (params: {
  providerIds?: ContentProviderId[];
  interestIds: string[];
  limit: number;
  locale: string;
  mode: "selected" | "all";
}): Promise<{ items: ContentItem[]; debug: ContentEngineDebug }> => {
  const supabase = await createSupabaseServerClient();
  const serviceSupabase = await createSupabaseServiceRoleClient();
  const normalizedInterests = normalizeInterestIds(params.interestIds);

  if (!serviceSupabase || normalizedInterests.length === 0) {
    return legacyFallback(params, supabase);
  }

  const fetchStart = Date.now();
  const { items: providerItems, debug } = await fetchProviderItems(
    params.providerIds,
    params,
    supabase,
  );

  // Ingestion
  let catalogRows: CatalogRow[] = [];
  try {
    const ingestionResult = await upsertCatalog(serviceSupabase, providerItems);
    catalogRows = ingestionResult.rows;
    debug.ingestion = {
      upserted: ingestionResult.upserted,
      updated: ingestionResult.updated,
      error: null,
    };
  } catch (error) {
    debug.ingestion = { upserted: 0, updated: 0, error: (error as Error)?.message ?? String(error) };
    return legacyFallback(params, supabase);
  }

  const interestRows = await fetchInterests(serviceSupabase, normalizedInterests);
  const interestEmbeddings = await ensureInterestEmbeddings(serviceSupabase, interestRows);
  debug.embeddings = {
    interestMissing: interestEmbeddings.missing,
    contentMissing: 0,
    usedModel: interestEmbeddings.usedModel,
    error: interestEmbeddings.error,
  };

  const contentEmbeddings = await ensureContentEmbeddings(serviceSupabase, catalogRows);
  debug.embeddings.contentMissing = contentEmbeddings.missing;
  if (!contentEmbeddings.usedModel && !getEmbeddingApiKey()) {
    debug.fallback = { reason: "Embedding key missing" };
    return legacyFallback(params, supabase);
  }

  // Build query embedding
  const queryVectors = normalizedInterests
    .map((id) => interestEmbeddings.embeddings[id])
    .filter((v): v is number[] => Array.isArray(v));
  let queryEmbedding: number[] | null = null;
  if (queryVectors.length > 0) {
    const dimension = queryVectors[0].length;
    const sum = new Array(dimension).fill(0);
    queryVectors.forEach((vec) => {
      vec.forEach((value, idx) => {
        sum[idx] += value;
      });
    });
    queryEmbedding = sum.map((v) => v / queryVectors.length);
  } else {
    const fallbackText = interestRows.map((i) => i.title).join("; ");
    queryEmbedding = await getEmbedding(fallbackText);
  }

  if (!queryEmbedding) {
    debug.fallback = { reason: "Failed to build query embedding" };
    return legacyFallback(params, supabase);
  }

  // Semantic retrieval
  const semanticStart = Date.now();
  const candidates = semanticRetrieve(
    queryEmbedding,
    contentEmbeddings.embeddings,
    catalogRows,
    params.providerIds,
  );
  debug.semantic = {
    topK: Math.min(DEFAULT_TOP_K, candidates.length),
    latencyMs: Date.now() - semanticStart,
    usedModel: contentEmbeddings.usedModel ?? interestEmbeddings.usedModel,
  };

  const topK = candidates.slice(0, Math.max(params.limit * 3, DEFAULT_TOP_K));
  const interestTitleMap = await fetchInterestTitleMap(supabase, normalizedInterests);
  const hydrated = hydrateContentItems(
    topK.map((c) => c.row),
    interestTitleMap,
    normalizedInterests,
  );

  // Pre-filter
  const preFiltered = hydrated.filter(
    (item) => !heuristicAd(item.title, item.description ?? null),
  );

  // LLM rerank
  const rerankStart = Date.now();
  const { results: rerankResults, debug: llmDebug } = await rerank(
    Array.from(interestTitleMap.values()),
    preFiltered.map(
      (item): RerankCandidate => ({
        id: item.id,
        title: item.title,
        description: item.description ?? "",
        provider: item.provider,
        type: item.type,
        url: item.url ?? undefined,
        channelTitle: (item.meta as { channelTitle?: string })?.channelTitle ?? undefined,
      }),
    ),
  );

  const rerankMap = new Map(rerankResults.map((r) => [r.id, r]));
  const scored = preFiltered
    .reduce<Array<{ item: ContentItem; rerank: typeof rerankResults[number] }>>(
      (acc, item) => {
        const rerankEntry = rerankMap.get(item.id);
        if (!rerankEntry) return acc;
        const publishedAt = (item.meta as { publishedAt?: string })?.publishedAt;
        const recencyBoost =
          publishedAt && !Number.isNaN(new Date(publishedAt).getTime())
            ? Math.max(
                0,
                0.2 *
                  (1 -
                    Math.min(
                      1,
                      (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24 * 90),
                    )),
              )
            : 0;
        const diversityHint =
          item.provider === "youtube" || item.provider === "telegram"
            ? 0.05
            : item.provider === "articles"
              ? 0.08
              : 0.03;
        const score = rerankEntry.score * 0.7 + recencyBoost + diversityHint;
        acc.push({
          item: {
            ...item,
            score,
            why: rerankEntry.reason ?? item.why,
          },
          rerank: rerankEntry,
        });
        return acc;
      },
      [],
    )
    .filter((entry) => !entry.rerank.isAd && !entry.rerank.isOfftopic)
    .sort((a, b) => (b.item.score ?? 0) - (a.item.score ?? 0));

  debug.llm = {
    filteredAd: rerankResults.filter((r) => r.isAd).length,
    filteredOfftopic: rerankResults.filter((r) => r.isOfftopic).length,
    avgScore:
      rerankResults.length > 0
        ? rerankResults.reduce((sum, r) => sum + r.score, 0) / rerankResults.length
        : null,
    latencyMs: Date.now() - rerankStart,
    usedModel: llmDebug.usedModel,
    mode: llmDebug.mode,
    error: llmDebug.error,
  };

  // Diversity
  const diversityResult = applyDiversity(
    scored.map((entry) => ({ item: entry.item, score: entry.item.score ?? 0 })),
    params.limit,
  );
  debug.diversity = {
    droppedByProvider: diversityResult.droppedProvider,
    droppedByChannel: diversityResult.droppedChannel,
    enforcedProviders: diversityResult.enforcedProviders,
  };

  const totalLatency = Date.now() - fetchStart;
  debug.semantic = { ...(debug.semantic ?? {}), latencyMs: totalLatency };

  return { items: diversityResult.items, debug };
};
