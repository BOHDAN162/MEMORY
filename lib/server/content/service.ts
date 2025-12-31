import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCached, setCached, stableHash } from "./cache";
import { getProviders } from "./providers";
import type { ContentItem, ContentProviderId, ProviderRequest } from "./types";

type GetContentParams = {
  providerIds?: ContentProviderId[];
  interestIds: string[];
  limit?: number;
  locale?: string;
};

type GetContentDebug = {
  cacheHits: Partial<Record<ContentProviderId, boolean>>;
  usedProviders: ContentProviderId[];
  hashes: Partial<Record<ContentProviderId, string>>;
};

export const getContent = async (
  params: GetContentParams,
): Promise<{ items: ContentItem[]; debug: GetContentDebug }> => {
  const supabase = await createSupabaseServerClient();
  const interestIdsSorted = Array.from(new Set(params.interestIds.filter(Boolean))).sort(
    (a, b) => a.localeCompare(b),
  );

  const providers = getProviders(params.providerIds);
  const debug: GetContentDebug = {
    cacheHits: {},
    usedProviders: providers.map((provider) => provider.id),
    hashes: {},
  };

  const itemsWithOrder: Array<{ item: ContentItem; order: number }> = [];

  for (const provider of providers) {
    const request: ProviderRequest = {
      interestIds: interestIdsSorted,
      limit: params.limit,
      locale: params.locale,
    };

    const hash = stableHash({
      v: 1,
      provider: provider.id,
      interestIds: interestIdsSorted,
      limit: params.limit ?? null,
      locale: params.locale ?? null,
    });

    debug.hashes[provider.id] = hash;

    const cached = await getCached(supabase, provider.id, hash, provider.ttlSeconds);

    if (cached) {
      debug.cacheHits[provider.id] = true;
      const baseOrder = itemsWithOrder.length;
      cached.forEach((item, index) => itemsWithOrder.push({ item, order: baseOrder + index }));
      continue;
    }

    debug.cacheHits[provider.id] = false;
    const providerItems = await provider.fetch(request);
    await setCached(supabase, provider.id, hash, providerItems);
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
