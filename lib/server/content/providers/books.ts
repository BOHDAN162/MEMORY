import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentItem, ContentProvider, ProviderFetchResult, ProviderRequest } from "../types";

type InterestRow = {
  id: string;
  title: string;
  synonyms: string[];
};

type OpenLibraryDoc = {
  key?: string;
  title?: string | null;
  subtitle?: string | null;
  first_sentence?: string | string[] | null;
  author_name?: string[] | null;
  cover_i?: number | null;
  first_publish_year?: number | null;
  publish_year?: number[] | null;
  number_of_pages_median?: number | null;
  language?: string[] | null;
  isbn?: string[] | null;
};

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 40;
const TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 500;

type FetchInterestsResult = {
  interests: InterestRow[];
  error: string | null;
};

type OpenLibrarySearchResponse = {
  docs?: OpenLibraryDoc[];
};

type OpenLibraryResult = {
  docs: OpenLibraryDoc[];
  error: string | null;
};

const fetchInterestRows = async (
  supabase: SupabaseClient,
  interestIds: string[],
): Promise<FetchInterestsResult> => {
  const { data, error } = await supabase
    .from("interests")
    .select("id, title, synonyms")
    .in("id", interestIds);

  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[books] failed to load interests", error?.message);
    }
    return { interests: [], error: "Failed to load interests (RLS or query error)" };
  }

  const interests = data
    .map((row) => ({
      id: row.id,
      title: row.title,
      synonyms: Array.isArray(row.synonyms)
        ? row.synonyms.filter((syn): syn is string => typeof syn === "string" && Boolean(syn.trim()))
        : [],
    }))
    .filter((row) => Boolean(row.title?.trim()));

  if (interests.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[books] interests query returned no rows");
    }
    return { interests: [], error: "Failed to load interests (RLS or query error)" };
  }

  return { interests, error: null };
};

const buildQuery = (interest: InterestRow): string => {
  const keywords = [interest.title, ...interest.synonyms.slice(0, 2)]
    .map((word) => word.trim())
    .filter(Boolean);

  const query = keywords.join(" ");
  if (query) return query;

  return interest.title?.trim() ?? "";
};

const createAbortController = (timeoutMs: number): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchOpenLibrary = async (
  query: string,
  limit: number,
  locale: string,
  attempt = 0,
): Promise<OpenLibraryResult> => {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    mode: "everything",
  });

  const { signal, cleanup } = createAbortController(TIMEOUT_MS);

  try {
    const response = await fetch(`${OPEN_LIBRARY_SEARCH_URL}?${params.toString()}`, {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "MEMORY-OS/1.0 (contact: dev@local)",
        "Accept-Language": locale,
      },
      cache: "no-store",
    });

    cleanup();

    if (response.status === 429 && attempt === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[books] OpenLibrary rate limited, retrying once", {
          status: response.status,
          statusText: response.statusText,
        });
      }
      await delay(RETRY_DELAY_MS);
      return fetchOpenLibrary(query, limit, locale, attempt + 1);
    }

    if (!response.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[books] request failed", response.status, response.statusText);
      }
      return { docs: [], error: `${response.status} ${response.statusText}`.trim() };
    }

    const payload = (await response.json()) as OpenLibrarySearchResponse;
    return { docs: payload?.docs ?? [], error: null };
  } catch (error) {
    cleanup();
    if (process.env.NODE_ENV !== "production") {
      console.error("[books] fetch error", (error as Error)?.message ?? error);
    }
    return { docs: [], error: (error as Error)?.message ?? "Unknown fetch error" };
  }
};

const pickDescription = (doc: OpenLibraryDoc): string | null => {
  if (typeof doc.subtitle === "string" && doc.subtitle.trim()) {
    return doc.subtitle.trim();
  }

  if (Array.isArray(doc.first_sentence)) {
    const sentence = doc.first_sentence.find((item) => typeof item === "string" && item.trim());
    if (sentence) return sentence.trim();
  }

  if (typeof doc.first_sentence === "string" && doc.first_sentence.trim()) {
    return doc.first_sentence.trim();
  }

  return null;
};

const normalizeItem = (
  doc: OpenLibraryDoc,
  interests: InterestRow[],
  query: string,
  locale: string,
  limit: number,
): ContentItem | null => {
  const key = doc.key;
  if (!key) return null;

  const title = doc.title?.trim() || "Книга";
  const description = pickDescription(doc);
  const authors = Array.isArray(doc.author_name)
    ? doc.author_name.filter((author) => typeof author === "string" && author.trim())
    : [];
  const publishedYear = doc.first_publish_year ?? doc.publish_year?.[0] ?? null;
  const pages = doc.number_of_pages_median ?? null;
  const language = Array.isArray(doc.language)
    ? doc.language.find((lang) => typeof lang === "string" && lang.trim()) ?? null
    : null;
  const isbn = Array.isArray(doc.isbn)
    ? doc.isbn.find((code) => typeof code === "string" && code.trim()) ?? null
    : null;
  const image = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null;

  const primaryInterest = interests[0];
  const titleLower = title.toLowerCase();
  let score = 1;

  if (image) score += 0.2;
  if (publishedYear && publishedYear >= new Date().getFullYear() - 6) {
    score += 0.2;
  } else if (publishedYear && publishedYear >= 2010) {
    score += 0.1;
  }

  if (primaryInterest && titleLower.includes(primaryInterest.title.toLowerCase())) {
    score += 0.1;
  }

  return {
    id: `openlibrary:${key}`,
    provider: "books",
    type: "book",
    title,
    description,
    image,
    url: `https://openlibrary.org${key}`,
    interestIds: interests.map((interest) => interest.id),
    why: primaryInterest
      ? `По интересу “${primaryInterest.title}” / ключевым словам “${query}”`
      : `Подборка по ключевым словам “${query}”`,
    score,
    meta: {
      authors,
      publishedYear,
      pages,
      language,
      source: "Open Library",
      isbn,
      locale,
      limit,
      query,
    },
  };
};

const booksProvider: ContentProvider = {
  id: "books",
  ttlSeconds: 60 * 60 * 24,
  async fetch(req: ProviderRequest): Promise<ProviderFetchResult> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[books] Supabase client is not configured");
      }
      return { items: [], error: "Supabase client is not configured" };
    }

    const interestIds = Array.from(new Set(req.interestIds.filter(Boolean)));
    if (interestIds.length === 0) return { items: [], error: null };

    const { interests, error: interestsError } = await fetchInterestRows(supabase, interestIds);
    if (interests.length === 0) {
      return { items: [], error: interestsError };
    }

    const limit = Math.max(1, Math.min(req.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
    const locale = req.locale ?? "ru";
    const primaryInterest = interests[0];
    const baseQuery = buildQuery(primaryInterest) || primaryInterest.title;

    if (!baseQuery) return { items: [], error: "No query keywords available for books search" };

    let searchLimit = limit;
    const primaryResponse = await fetchOpenLibrary(baseQuery, searchLimit, locale);
    let docs = primaryResponse.docs ?? [];
    let providerError = primaryResponse.error;
    let effectiveQuery = baseQuery;

    if (docs.length === 0 && primaryInterest.title) {
      const fallbackLimit = Math.min(limit, 10);
      searchLimit = fallbackLimit;
      const fallbackResponse = await fetchOpenLibrary(primaryInterest.title, fallbackLimit, locale);
      if (fallbackResponse.docs.length > 0) {
        docs = fallbackResponse.docs;
        effectiveQuery = primaryInterest.title;
        providerError = fallbackResponse.error ?? null;
      } else {
        providerError = fallbackResponse.error ?? providerError;
      }
    }

    const items: ContentItem[] = [];
    for (const doc of docs) {
      const normalized = normalizeItem(doc, interests, effectiveQuery, locale, searchLimit);
      if (!normalized) continue;
      items.push(normalized);
      if (items.length >= limit) break;
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[books] returning items", { count: items.length, error: providerError });
    }

    return { items, error: providerError ?? null };
  },
};

export default booksProvider;
