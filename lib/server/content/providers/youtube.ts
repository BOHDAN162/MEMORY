import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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
};

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";
const DEFAULT_TOTAL_LIMIT = 20;
const MIN_PER_INTEREST = 3;
const MAX_PER_INTEREST = 8;
const TIMEOUT_MS = 12_000;

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

const buildQuery = (interest: InterestRow): string => {
  const synonyms = Array.isArray(interest.synonyms)
    ? interest.synonyms.filter((syn) => typeof syn === "string" && syn.trim()).slice(0, 2)
    : [];

  return [interest.title, ...synonyms].join(" ");
};

const fetchInterestRows = async (
  supabase: SupabaseClient,
  interestIds: string[],
): Promise<InterestRow[]> => {
  const { data, error } = await supabase
    .from("interests")
    .select("id, title, synonyms")
    .in("id", interestIds);

  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[youtube] failed to load interests", error?.message);
    }
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    synonyms: Array.isArray(row.synonyms) ? row.synonyms : [],
  }));
};

const createAbortController = (timeoutMs: number): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
};

const fetchYouTube = async (
  query: string,
  limit: number,
  locale: string,
): Promise<YouTubeSearchResponse | null> => {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[youtube] YOUTUBE_API_KEY is not set");
    }
    return null;
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
    key: apiKey,
  });

  const { signal, cleanup } = createAbortController(TIMEOUT_MS);

  try {
    const response = await fetch(`${YOUTUBE_API_URL}?${params.toString()}`, {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    cleanup();

    if (!response.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[youtube] request failed", response.status, response.statusText);
      }
      return null;
    }

    const payload = (await response.json()) as YouTubeSearchResponse;
    return payload;
  } catch (error) {
    cleanup();
    if (process.env.NODE_ENV !== "production") {
      console.error("[youtube] fetch error", (error as Error)?.message ?? error);
    }
    return null;
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

  let score = 1;
  const titleLower = title.toLowerCase();
  if (titleLower.includes(interest.title.toLowerCase())) {
    score += 0.1;
  }

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
    score,
    meta: {
      channelTitle,
      publishedAt,
      interestId: interest.id,
      interestTitle: interest.title,
      query,
    },
  };
};

const youtubeProvider: ContentProvider = {
  id: "youtube",
  ttlSeconds: 60 * 60 * 12,
  async fetch(req: ProviderRequest): Promise<ProviderFetchResult> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[youtube] Supabase client is not configured");
      }
      return { items: [], error: "Supabase client is not configured" };
    }

    const interestIds = Array.from(new Set(req.interestIds.filter(Boolean)));
    if (interestIds.length === 0) return { items: [], error: null };

    const interests = await fetchInterestRows(supabase, interestIds);
    if (interests.length === 0) {
      return { items: [], error: "Failed to load interests (RLS or query error)" };
    }

    const totalLimit = Math.max(1, Math.min(req.limit ?? DEFAULT_TOTAL_LIMIT, DEFAULT_TOTAL_LIMIT));
    const perInterestLimit = Math.min(
      MAX_PER_INTEREST,
      Math.max(MIN_PER_INTEREST, Math.ceil(totalLimit / Math.max(1, interests.length))),
    );
    const locale = req.locale ?? "ru";

    const byVideoId = new Map<string, ContentItem>();

    for (const interest of interests) {
      const query = buildQuery(interest);
      const response = await fetchYouTube(query, perInterestLimit, locale);
      const items = response?.items ?? [];

      for (const rawItem of items) {
        const normalized = normalizeItem(rawItem, interest, query);
        if (!normalized) continue;

        const existing = byVideoId.get(normalized.id);
        if (existing) {
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
      }
    }

    const items = Array.from(byVideoId.values()).slice(0, totalLimit);

    if (process.env.NODE_ENV !== "production") {
      console.info("[youtube] returning items", { count: items.length });
    }

    return { items, error: null };
  },
};

export default youtubeProvider;
