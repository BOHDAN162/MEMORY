import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCached, setCached, stableHash } from "./cache";
import { getProviders } from "./providers";
import type {
  ContentItem,
  ContentProviderId,
  ProviderFetchResult,
  ProviderRequest,
} from "./types";

type GetContentParams = {
  providerIds?: ContentProviderId[];
  interestIds: string[];
  limit?: number;
  locale?: string;
};

type ProviderDebugInfo = {
  count: number;
  cacheHit: boolean;
  ms: number;
  error: string | null;
};

type GetContentDebug = {
  cacheHits: Partial<Record<ContentProviderId, boolean>>;
  usedProviders: ContentProviderId[];
  hashes: Partial<Record<ContentProviderId, string>>;
  providers: Partial<Record<ContentProviderId, ProviderDebugInfo>>;
};

export const getContent = async (
  params: GetContentParams,
): Promise<{ items: ContentItem[]; debug: GetContentDebug }> => {
  const supabase = await createSupabaseServerClient();
  const interestIdsSorted = Array.from(new Set(params.interestIds.filter(Boolean))).sort(
    (a, b) => a.localeCompare(b),
  );
  const effectiveLimit = Math.max(1, Math.min(params.limit ?? 20, 20));
  const effectiveLocale = params.locale ?? "ru";

  const providers = getProviders(params.providerIds);
  const debug: GetContentDebug = {
    cacheHits: {},
    usedProviders: providers.map((provider) => provider.id),
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

    const request: ProviderRequest = {
      interestIds: interestIdsSorted,
      limit: effectiveLimit,
      locale: effectiveLocale,
    };

    const defaultHashInput =
      provider.id === "youtube"
        ? JSON.stringify({
            provider: "youtube",
            interestIds: interestIdsSorted,
            limit: effectiveLimit,
            locale: effectiveLocale,
          })
        : {
            v: 1,
            provider: provider.id,
            interestIds: interestIdsSorted,
            limit: effectiveLimit ?? null,
            locale: effectiveLocale ?? null,
          };

    let hashInput: object | string = defaultHashInput;

    if (provider.getHashInput) {
      try {
        const customHashInput = await provider.getHashInput(request);
        if (customHashInput) {
          hashInput = customHashInput as object | string;
        }
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
      if (process.env.NODE_ENV !== "production") {
        console.info(`[content] cache hit for ${provider.id}`, {
          hash,
          count: cached.length,
        });
      }
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

    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[content] fetched ${providerItems.length} items from ${provider.id}`,
        providerError ? { hash, error: providerError } : { hash },
      );
    }
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

      if (aScore !== null && aScore !== undefined && bScore !== null && bScore !== undefined) {
        if (aScore === bScore) {
          return a.order - b.order;
        }
        return bScore - aScore;
      }

      if (aScore !== null && aScore !== undefined) return -1;
      if (bScore !== null && bScore !== undefined) return 1;
      return a.order - b.order;
    })
    .map(({ item }) => item);

  return { items, debug };
};
