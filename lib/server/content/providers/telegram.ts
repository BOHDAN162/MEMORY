import type { ContentProvider } from "../types";

const telegramProvider: ContentProvider = {
  id: "telegram",
  ttlSeconds: 60 * 60 * 12,
  async fetch() {
    return [];
  },
};

export default telegramProvider;
