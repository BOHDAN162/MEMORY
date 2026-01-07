import "server-only";

import { getEmbeddingApiKey } from "@/lib/config/env";

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
const MAX_TEXT_LENGTH = 2000;
const TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;
const CACHE_CAPACITY = 128;

type CachedValue = { vector: number[]; model: string };

class SimpleLRU {
  private map = new Map<string, CachedValue>();
  constructor(private capacity: number) {}

  get(key: string): CachedValue | undefined {
    const value = this.map.get(key);
    if (!value) return undefined;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: CachedValue) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) {
        this.map.delete(oldest);
      }
    }
    this.map.set(key, value);
  }
}

const cache = new SimpleLRU(CACHE_CAPACITY);

const truncate = (text: string): string => {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return text.slice(0, MAX_TEXT_LENGTH);
};

const createAbort = (timeoutMs: number): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
};

type OpenAIEmbeddingResponse = {
  data?: Array<{ embedding?: number[]; index?: number }>;
  error?: { message?: string };
};

const fetchEmbeddings = async (
  texts: string[],
  attempt: number,
): Promise<Array<number[] | null> | null> => {
  const key = getEmbeddingApiKey();
  if (!key) return null;

  const { signal, cleanup } = createAbort(TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts.map((text) => truncate(text)),
      }),
      signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as OpenAIEmbeddingResponse;
      const message = payload?.error?.message ?? response.statusText;
      throw new Error(`Embedding request failed: ${message}`);
    }

    const payload = (await response.json()) as OpenAIEmbeddingResponse;
    const data = Array.isArray(payload?.data) ? payload.data : [];
    const results: Array<number[] | null> = new Array(texts.length).fill(null);
    data.forEach((item, idx) => {
      const vector = Array.isArray(item.embedding) ? item.embedding : null;
      const position = typeof item.index === "number" ? item.index : idx;
      if (position >= 0 && position < results.length) {
        results[position] = vector;
      }
    });
    return results;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      return fetchEmbeddings(texts, attempt + 1);
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ai][embeddings] failed", (error as Error)?.message ?? error);
    }
    return null;
  } finally {
    cleanup();
  }
};

const fetchEmbedding = async (text: string, attempt: number): Promise<number[] | null> => {
  const key = getEmbeddingApiKey();
  if (!key) return null;

  const { signal, cleanup } = createAbort(TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncate(text),
      }),
      signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as OpenAIEmbeddingResponse;
      const message = payload?.error?.message ?? response.statusText;
      throw new Error(`Embedding request failed: ${message}`);
    }

    const payload = (await response.json()) as OpenAIEmbeddingResponse;
    const vector = payload?.data?.[0]?.embedding;
    if (!Array.isArray(vector)) {
      throw new Error("Invalid embedding response");
    }
    return vector;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      return fetchEmbedding(text, attempt + 1);
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ai][embeddings] failed", (error as Error)?.message ?? error);
    }
    return null;
  } finally {
    cleanup();
  }
};

export const getEmbedding = async (text: string): Promise<number[] | null> => {
  const normalized = truncate(text.trim());
  if (!normalized) return null;

  const cacheKey = `${EMBEDDING_MODEL}:${normalized}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached.vector;

  const embedding = await fetchEmbedding(normalized, 0);
  if (embedding) {
    cache.set(cacheKey, { vector: embedding, model: EMBEDDING_MODEL });
  }
  return embedding;
};

export const getEmbeddings = async (texts: string[]): Promise<Array<number[] | null>> => {
  if (texts.length === 0) return [];

  const normalized = texts.map((text) => truncate(text.trim()));
  const results: Array<number[] | null> = new Array(texts.length).fill(null);
  const toFetch: Array<{ index: number; text: string }> = [];

  normalized.forEach((text, index) => {
    if (!text) return;
    const cacheKey = `${EMBEDDING_MODEL}:${text}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      results[index] = cached.vector;
    } else {
      toFetch.push({ index, text });
    }
  });

  if (toFetch.length === 0) return results;

  const fetched = await fetchEmbeddings(
    toFetch.map((item) => item.text),
    0,
  );

  if (!fetched) return results;

  fetched.forEach((vector, fetchedIndex) => {
    const original = toFetch[fetchedIndex];
    if (!original) return;
    if (Array.isArray(vector)) {
      results[original.index] = vector;
      const cacheKey = `${EMBEDDING_MODEL}:${original.text}`;
      cache.set(cacheKey, { vector, model: EMBEDDING_MODEL });
    }
  });

  return results;
};
