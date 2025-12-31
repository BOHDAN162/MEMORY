export type ContentProviderId = "youtube" | "books" | "articles" | "telegram" | "prompts";

export type ContentType = "video" | "book" | "article" | "channel" | "prompt";

export interface ContentItem {
  id: string;
  provider: ContentProviderId;
  type: ContentType;
  title: string;
  url: string | null;
  image?: string | null;
  description?: string | null;
  meta?: Record<string, unknown>;
  interestIds: string[];
  why?: string | null;
  score?: number | null;
  cachedAt?: string | null;
}

export interface ProviderRequest {
  interestIds: string[];
  locale?: string;
  limit?: number;
  mode?: "selected" | "all";
}

export interface ProviderFetchResult {
  items: ContentItem[];
  error?: string | null;
}

export interface ContentProvider {
  id: ContentProviderId;
  ttlSeconds: number;
  getHashInput?: (req: ProviderRequest) => Promise<unknown> | unknown;
  fetch(req: ProviderRequest): Promise<ProviderFetchResult>;
}
