import "server-only";

import { runContentEngine, type ContentEngineDebug } from "./engine";
import type { ContentItem, ContentProviderId } from "./types";

type GetContentParams = {
  providerIds?: ContentProviderId[];
  interestIds: string[];
  limit?: number;
  locale?: string;
  mode?: "selected" | "all";
};

export type GetContentDebug = ContentEngineDebug;

export const getContent = async (
  params: GetContentParams,
): Promise<{ items: ContentItem[]; debug: GetContentDebug }> => {
  const interestIdsSorted = Array.from(new Set(params.interestIds.filter(Boolean))).sort(
    (a, b) => a.localeCompare(b),
  );
  const effectiveLimit = Math.max(1, Math.min(params.limit ?? 20, 20));
  const effectiveLocale = params.locale ?? "ru";

  return runContentEngine({
    providerIds: params.providerIds,
    interestIds: interestIdsSorted,
    limit: effectiveLimit,
    locale: effectiveLocale,
    mode: params.mode ?? "all",
  });
};
