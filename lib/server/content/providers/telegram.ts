import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TELEGRAM_CHANNELS } from "../catalog/telegram";
import type { ContentItem, ContentProvider, ProviderFetchResult, ProviderRequest } from "../types";

type InterestRow = {
  id: string;
  slug: string;
  title: string;
  cluster: string | null;
  synonyms?: string[] | null;
};

const clampLimit = (limit?: number) => {
  const value = typeof limit === "number" ? limit : 20;
  return Math.max(5, Math.min(value, 40));
};

const truncate = (value: string | null | undefined, max = 220) => {
  if (!value) return null;
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
};

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const telegramProvider: ContentProvider = {
  id: "telegram",
  ttlSeconds: 60 * 60 * 24 * 7,
  async fetch(req: ProviderRequest): Promise<ProviderFetchResult> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return { items: [], error: "Supabase client is not configured" };
    }

    const interestIds = Array.from(new Set(req.interestIds.filter(Boolean)));
    if (interestIds.length === 0) return { items: [], error: null };

    const { data, error } = await supabase
      .from("interests")
      .select("id, slug, title, cluster, synonyms")
      .in("id", interestIds);

    if (error || !data) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[telegram] failed to load interests", error?.message);
      }
      return { items: [], error: "Failed to load interests" };
    }

    const interests: InterestRow[] = data
      .map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        cluster: row.cluster ?? null,
        synonyms: Array.isArray(row.synonyms)
          ? row.synonyms.filter((syn): syn is string => typeof syn === "string" && Boolean(syn.trim()))
          : [],
      }))
      .filter((row) => Boolean(row.id) && Boolean(row.title));

    if (interests.length === 0) {
      return { items: [], error: "No interests to match" };
    }

    const limit = clampLimit(req.limit);

    const scored = TELEGRAM_CHANNELS.map((channel) => {
      const matchedInterestIds = new Set<string>();
      let score = 0;

      const channelSlugs = (channel.interestSlugs ?? []).map(normalize);
      const channelTitles = (channel.interestTitles ?? []).map(normalize);
      const channelClusters = (channel.clusters ?? []).map(normalize);

      for (const interest of interests) {
        const interestSlug = normalize(interest.slug);
        const interestTitle = normalize(interest.title);
        const interestCluster = normalize(interest.cluster);
        const interestSynonyms = (interest.synonyms ?? []).map(normalize);

        const slugMatch = interestSlug && channelSlugs.includes(interestSlug);
        const titleMatch =
          interestTitle &&
          (channelTitles.includes(interestTitle) || channelTitles.some((title) => title === interestTitle));
        const synonymMatch = interestSynonyms.some((syn) => channelTitles.includes(syn));
        const clusterMatch = interestCluster && channelClusters.includes(interestCluster);

        if (slugMatch || titleMatch || synonymMatch) {
          score += 1;
          matchedInterestIds.add(interest.id);
        } else if (clusterMatch) {
          score += 0.4;
          matchedInterestIds.add(interest.id);
        }
      }

      const priorityBonus = (channel.priority ?? 1) * 0.1;
      score += priorityBonus;

      return {
        channel,
        matchedInterestIds: Array.from(matchedInterestIds),
        score,
      };
    })
      .filter((entry) => entry.matchedInterestIds.length > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const priorityA = a.channel.priority ?? 1;
        const priorityB = b.channel.priority ?? 1;
        if (priorityB !== priorityA) return priorityB - priorityA;
        return a.channel.title.localeCompare(b.channel.title, "ru", { sensitivity: "base" });
      })
      .slice(0, limit);

    const items: ContentItem[] = scored.map(({ channel, matchedInterestIds }) => {
      const interest = interests.find((row) => matchedInterestIds.includes(row.id));
      const cluster = interest?.cluster;
      const hasDirect = Boolean(
        channel.interestSlugs?.some((slug) => normalize(slug) === normalize(interest?.slug)) ||
          channel.interestTitles?.some((title) => normalize(title) === normalize(interest?.title)),
      );
      const why = hasDirect && interest
        ? `Канал по интересу “${interest.title}”`
        : cluster
          ? `Канал по кластеру “${cluster}”`
          : null;

      return {
        id: channel.id,
        provider: "telegram",
        type: "channel",
        title: channel.title,
        url: channel.url,
        image: channel.image ?? null,
        description: truncate(channel.description, 220),
        interestIds: matchedInterestIds,
        why,
        score: channel.priority ? channel.priority * 0.1 + (hasDirect ? 1 : 0.4) : undefined,
        meta: {
          handle: channel.handle,
          clusters: channel.clusters ?? [],
          language: channel.language ?? null,
        },
      } satisfies ContentItem;
    });

    return { items, error: null };
  },
};

export default telegramProvider;
