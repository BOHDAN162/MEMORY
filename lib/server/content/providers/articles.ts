import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";
import type { ContentItem, ContentProvider, ProviderFetchResult, ProviderRequest } from "../types";

type InterestRow = {
  id: string;
  title: string;
  synonyms: string[];
};

type ArticlesContext = {
  interestIds: string[];
  interests: InterestRow[];
  primaryInterest: InterestRow | null;
  query: string;
  limit: number;
  locale: string;
  error: string | null;
};

type ArticlesProviderRequest = ProviderRequest & {
  __articlesContext?: ArticlesContext;
};

type RssItem = {
  title?: string | null;
  link?: string | null;
  guid?: string | { "#text"?: string | null } | null;
  description?: string | null;
  pubDate?: string | null;
};

type ParseResult = {
  items: RssItem[];
  error: string | null;
};

const RSS_SEARCH_URL = "https://habr.com/ru/rss/search/";
const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 5;
const MAX_LIMIT = 40;
const TIMEOUT_MS = 12_000;
const DESCRIPTION_MAX_LENGTH = 220;

const clampLimit = (limit: number | undefined): number =>
  Math.max(MIN_LIMIT, Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT));

const normalizeSynonyms = (synonyms: unknown): string[] =>
  Array.isArray(synonyms)
    ? synonyms
        .map((synonym) => (typeof synonym === "string" ? synonym.trim() : ""))
        .filter(Boolean)
    : [];

const fetchInterestRows = async (
  supabase: SupabaseClient,
  interestIds: string[],
): Promise<{ interests: InterestRow[]; error: string | null }> => {
  const { data, error } = await supabase
    .from("interests")
    .select("id, title, synonyms")
    .in("id", interestIds);

  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[articles] failed to load interests", error?.message);
    }
    return { interests: [], error: "Failed to load interests (RLS or query error)" };
  }

  const byId = new Map(
    data
      .map((row) => ({
        id: row.id,
        title: typeof row.title === "string" ? row.title.trim() : "",
        synonyms: normalizeSynonyms(row.synonyms),
      }))
      .filter((row) => row.id && row.title)
      .map((row) => [row.id, row] as const),
  );

  const ordered = interestIds
    .map((id) => byId.get(id))
    .filter((row): row is InterestRow => Boolean(row?.title));

  if (ordered.length === 0) {
    return { interests: [], error: "Failed to load interests (RLS or query error)" };
  }

  return { interests: ordered, error: null };
};

const buildQuery = (interest: InterestRow | null): string => {
  if (!interest) return "";
  const keywords = [interest.title, ...interest.synonyms.slice(0, 2)]
    .map((word) => word.trim())
    .filter(Boolean);

  const query = keywords.join(" ");
  if (query) return query;

  return interest.title ?? "";
};

const prepareContext = async (req: ArticlesProviderRequest): Promise<ArticlesContext> => {
  if (req.__articlesContext) return req.__articlesContext;

  const interestIds = Array.from(new Set(req.interestIds.filter(Boolean)));
  const limit = clampLimit(req.limit);
  const locale = req.locale ?? "ru";

  if (interestIds.length === 0) {
    const context: ArticlesContext = {
      interestIds,
      interests: [],
      primaryInterest: null,
      query: "",
      limit,
      locale,
      error: null,
    };
    req.__articlesContext = context;
    return context;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const context: ArticlesContext = {
      interestIds,
      interests: [],
      primaryInterest: null,
      query: "",
      limit,
      locale,
      error: "Supabase client is not configured",
    };
    req.__articlesContext = context;
    return context;
  }

  const { interests, error } = await fetchInterestRows(supabase, interestIds);

  const primaryInterest = interests[0] ?? null;
  const query = buildQuery(primaryInterest);

  const context: ArticlesContext = {
    interestIds,
    interests,
    primaryInterest,
    query,
    limit,
    locale,
    error: error ?? null,
  };

  if (!query && !context.error) {
    context.error = "No query keywords available for articles search";
  }

  req.__articlesContext = context;
  return context;
};

const createAbortController = (timeoutMs: number): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
};

const parseRss = (xml: string): ParseResult => {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      trimValues: true,
    });
    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel;
    const rawItems = channel?.item;
    if (!rawItems) return { items: [], error: null };

    const items = Array.isArray(rawItems) ? rawItems : [rawItems];

    return { items, error: null };
  } catch (error) {
    return {
      items: [],
      error: `RSS parse failed: ${(error as Error)?.message ?? "Unknown error"}`,
    };
  }
};

const fetchRss = async (query: string, locale: string): Promise<ParseResult> => {
  if (!query) return { items: [], error: "Empty query for articles search" };

  const url = new URL(RSS_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("target_type", "posts");
  url.searchParams.set("order", "relevance");

  const { signal, cleanup } = createAbortController(TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal,
      headers: {
        Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
        "User-Agent": "MEMORY-OS/1.0",
        "Accept-Language": locale,
      },
      cache: "no-store",
    });

    cleanup();

    if (!response.ok) {
      return { items: [], error: `${response.status} ${response.statusText}`.trim() };
    }

    const xml = await response.text();
    return parseRss(xml);
  } catch (error) {
    cleanup();
    return { items: [], error: (error as Error)?.message ?? "Unknown fetch error" };
  }
};

const stripHtml = (html?: string | null): string => {
  if (!html) return "";
  const withoutScripts = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  return withoutTags.replace(/\s+/g, " ").trim();
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
};

const extractImage = (html?: string | null): string | null => {
  if (!html) return null;
  const match = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (!match) return null;

  const src = match[1]?.trim();
  if (!src) return null;
  if (src.startsWith("//")) return `https:${src}`;
  return src;
};

const buildWhy = (context: ArticlesContext): string | null => {
  if (context.primaryInterest?.title || context.query) {
    const primaryTitle = context.primaryInterest?.title ?? context.query;
    const keywords = context.query || primaryTitle;
    return `Статья по интересу “${primaryTitle}” / ключевым словам “${keywords}”`;
  }
  return null;
};

const normalizeRssItem = (item: RssItem, context: ArticlesContext): ContentItem | null => {
  const link = typeof item.link === "string" ? item.link.trim() : null;
  const guidValue =
    typeof item.guid === "string"
      ? item.guid.trim()
      : typeof item.guid === "object"
        ? item.guid?.["#text"]?.trim()
        : null;
  const id = guidValue || link;

  if (!link || !id) return null;

  const descriptionHtml = typeof item.description === "string" ? item.description : null;
  const cleanDescription = stripHtml(descriptionHtml);
  const description =
    cleanDescription && cleanDescription.length > 0
      ? truncateText(cleanDescription, DESCRIPTION_MAX_LENGTH)
      : null;
  const image = extractImage(descriptionHtml);
  const title = item.title?.trim() || "Статья";

  const publishedMs = item.pubDate ? new Date(item.pubDate).getTime() : Number.NaN;
  const now = Date.now();
  const twoYearsMs = 1000 * 60 * 60 * 24 * 365 * 2;
  const fiveYearsMs = 1000 * 60 * 60 * 24 * 365 * 5;

  let score = 1;
  if (image) score += 0.2;
  if (!Number.isNaN(publishedMs)) {
    const ageMs = now - publishedMs;
    if (ageMs <= twoYearsMs) {
      score += 0.25;
    } else if (ageMs <= fiveYearsMs) {
      score += 0.1;
    }
  }

  return {
    id: `habr:${id}`,
    provider: "articles",
    type: "article",
    title,
    description,
    url: link,
    image,
    interestIds: context.interestIds,
    why: buildWhy(context),
    score,
    meta: {
      source: "Habr RSS",
      publishedAt: item.pubDate ?? null,
      query: context.query,
      locale: context.locale,
      limit: context.limit,
    },
  };
};

const articlesProvider: ContentProvider = {
  id: "articles",
  ttlSeconds: 60 * 60 * 12,
  async getHashInput(req: ProviderRequest) {
    const context = await prepareContext(req as ArticlesProviderRequest);
    return {
      v: 1,
      provider: "articles",
      interestIds: context.interestIds,
      query: context.query,
      limit: context.limit,
      locale: context.locale,
    };
  },
  async fetch(req: ProviderRequest): Promise<ProviderFetchResult> {
    const context = await prepareContext(req as ArticlesProviderRequest);

    if (context.interestIds.length === 0) {
      return { items: [], error: null };
    }

    if (context.error) {
      return { items: [], error: context.error };
    }

    if (!context.query) {
      return { items: [], error: "No query keywords available for articles search" };
    }

    const { items: rssItems, error: fetchError } = await fetchRss(context.query, context.locale);

    const items: ContentItem[] = [];

    for (const rssItem of rssItems) {
      const normalized = normalizeRssItem(rssItem, context);
      if (!normalized) continue;
      items.push(normalized);
      if (items.length >= context.limit) break;
    }

    const providerError =
      fetchError ?? (rssItems.length === 0 ? "No articles returned from RSS search" : null);

    return { items, error: providerError };
  },
};

export default articlesProvider;
