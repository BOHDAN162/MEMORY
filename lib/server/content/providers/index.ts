import articlesProvider from "./articles";
import booksProvider from "./books";
import promptsProvider from "./prompts";
import telegramProvider from "./telegram";
import youtubeProvider from "./youtube";
import type { ContentProvider, ContentProviderId } from "../types";

export const contentProviders: Record<ContentProviderId, ContentProvider> = {
  youtube: youtubeProvider,
  books: booksProvider,
  articles: articlesProvider,
  telegram: telegramProvider,
  prompts: promptsProvider,
};

export const getProviders = (providerIds?: ContentProviderId[]): ContentProvider[] => {
  if (providerIds && providerIds.length > 0) {
    return providerIds
      .map((id) => contentProviders[id])
      .filter((provider): provider is ContentProvider => Boolean(provider));
  }

  return Object.values(contentProviders);
};
