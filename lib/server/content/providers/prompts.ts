import type { ContentProvider, ProviderFetchResult, ProviderRequest } from "../types";

const promptsProvider: ContentProvider = {
  id: "prompts",
  ttlSeconds: 60 * 60 * 12,
  async fetch(_req: ProviderRequest): Promise<ProviderFetchResult> {
    void _req;
    return { items: [], error: null };
  },
};

export default promptsProvider;
