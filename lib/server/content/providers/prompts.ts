import type { ContentProvider } from "../types";

const promptsProvider: ContentProvider = {
  id: "prompts",
  ttlSeconds: 60 * 60 * 12,
  async fetch() {
    return [];
  },
};

export default promptsProvider;
