import type { ContentProvider } from "../types";

const booksProvider: ContentProvider = {
  id: "books",
  ttlSeconds: 60 * 60 * 12,
  async fetch() {
    return [];
  },
};

export default booksProvider;
