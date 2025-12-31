import type { ContentProvider } from "../types";

const youtubeProvider: ContentProvider = {
  id: "youtube",
  ttlSeconds: 60 * 60 * 12,
  async fetch() {
    // TODO: Implement YouTube provider in stage 6.2.
    return [];
  },
};

export default youtubeProvider;
