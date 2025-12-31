import "server-only";

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentItem, ContentProviderId } from "./types";

const stableStringify = (value: unknown): string => {
  if (value === undefined) {
    return "undefined";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const serialized = entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(",");

  return `{${serialized}}`;
};

export const stableHash = (input: object | string): string => {
  const source = typeof input === "string" ? input : stableStringify(input);
  return createHash("sha256").update(source).digest("hex");
};

export const isFresh = (createdAt: string, ttlSeconds: number): boolean => {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime) || ttlSeconds <= 0) {
    return false;
  }

  const ageMs = Date.now() - createdTime;
  return ageMs < ttlSeconds * 1000;
};

type CacheRow = {
  payload_json?: ContentItem[] | null;
  created_at?: string | null;
};

export const getCached = async (
  supabase: SupabaseClient | null,
  providerId: ContentProviderId,
  hash: string,
  ttlSeconds: number,
): Promise<ContentItem[] | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("content_cache")
    .select("payload_json, created_at")
    .eq("provider", providerId)
    .eq("query_hash", hash)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data?.length) {
    return null;
  }

  const row = data[0] as CacheRow;

  if (!row.created_at || !isFresh(row.created_at, ttlSeconds)) {
    return null;
  }

  const payload = Array.isArray(row.payload_json) ? row.payload_json : [];
  const cachedAt = row.created_at ?? null;

  return payload.map((item) => ({ ...item, cachedAt: item.cachedAt ?? cachedAt }));
};

export const setCached = async (
  supabase: SupabaseClient | null,
  providerId: ContentProviderId,
  hash: string,
  items: ContentItem[],
): Promise<void> => {
  if (!supabase) {
    return;
  }

  const payload = items.map((item) => ({
    ...item,
    cachedAt: item.cachedAt ?? new Date().toISOString(),
  }));

  await supabase.from("content_cache").upsert(
    {
      provider: providerId,
      query_hash: hash,
      payload_json: payload,
    },
    { onConflict: "provider,query_hash" },
  );
};
