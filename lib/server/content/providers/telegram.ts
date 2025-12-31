import type { ContentProvider, ProviderFetchResult, ProviderRequest } from "../types";

const telegramProvider: ContentProvider = {
  id: "telegram",
  ttlSeconds: 60 * 60 * 12,
  async fetch(_req: ProviderRequest): Promise<ProviderFetchResult> {
    void _req;
    return { items: [], error: null };
  },
};

export default telegramProvider;
