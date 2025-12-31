import type { ContentProvider } from "../types";

const articlesProvider: ContentProvider = {
  id: "articles",
  ttlSeconds: 60 * 60 * 12,
  async fetch() {
    return [];
  },
};

export default articlesProvider;
