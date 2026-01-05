"use client";

import { useEffect, useMemo, useState } from "react";
import ContentGrid from "@/components/content/ContentGrid";
import ContentToolbar from "@/components/content/ContentToolbar";
import type { ContentProviderId, ContentType, ContentItem } from "@/lib/server/content/types";

/* =========================
   🔒 СТАБИЛЬНАЯ КОНФИГУРАЦИЯ
   ========================= */

const ALL_PROVIDERS: ContentProviderId[] = [
  "youtube",
  "books",
  "articles",
  "telegram",
  "prompts",
];

const providerLabels: Record<ContentProviderId, string> = {
  youtube: "YouTube",
  books: "Books",
  articles: "Articles",
  telegram: "Telegram",
  prompts: "Prompts",
};

/* ========================= */

export type NormalizedContentItem = ContentItem & {
  providerLabel: string;
  typeLabel: string;
  whyText: string;
  promptText: string | null;
  promptTags: string[];
  dateLabel: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  publishedYear?: number | null;
  sortableDate?: number | null;
};

export type ContentDebugInfo = {
  cacheHits?: Partial<Record<ContentProviderId, boolean>>;
  usedProviders?: ContentProviderId[];
  hashes?: Partial<Record<ContentProviderId, string>>;
  providers?: Partial<
    Record<
      ContentProviderId,
      {
        count?: number;
        cacheHit?: boolean;
        ms?: number;
        error?: string | null;
      }
    >
  >;
  ingestion?: { upserted?: number; updated?: number; error?: string | null };
  embeddings?: {
    interestMissing?: number;
    contentMissing?: number;
    usedModel?: string | null;
    error?: string | null;
  };
  semantic?: { topK?: number; latencyMs?: number; usedModel?: string | null; cacheHit?: boolean };
  llm?: {
    filteredAd?: number;
    filteredOfftopic?: number;
    avgScore?: number | null;
    latencyMs?: number;
    usedModel?: string | null;
    mode?: string | null;
    error?: string | null;
  };
  diversity?: { droppedByProvider?: number; droppedByChannel?: number; enforcedProviders?: number };
  fallback?: { reason?: string };
};

type SortOption = "relevance" | "new" | "random" | "title";

type ContentHubProps = {
  items: NormalizedContentItem[];
  selectionMode: "selected" | "all";
  interestIds: string[];
  debugEnabled?: boolean;
  interestsError?: string | null;
  availableProviders: ContentProviderId[];
};

/* =========================
   🔧 УТИЛИТЫ
   ========================= */

const buildSeed = (input: string): number => {
  let seed = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    seed ^= input.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
};

const mulberry32 = (a: number) => {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = <T,>(items: T[], seed: number): T[] => {
  const random = mulberry32(seed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const getDateValue = (item: NormalizedContentItem): number | null => {
  if (item.sortableDate != null) return item.sortableDate;
  if (item.publishedAt) return new Date(item.publishedAt).getTime();
  if (item.createdAt) return new Date(item.createdAt).getTime();
  if (item.publishedYear) return new Date(item.publishedYear, 0, 1).getTime();
  return null;
};

const sortItems = (items: NormalizedContentItem[], sort: SortOption, seed: number) => {
  if (sort === "random") return shuffle(items, seed);
  if (sort === "title") return [...items].sort((a, b) => a.title.localeCompare(b.title, "ru"));
  if (sort === "new") {
    return [...items].sort((a, b) => {
      const ad = getDateValue(a);
      const bd = getDateValue(b);
      if (ad != null && bd != null) return bd - ad;
      if (ad != null) return -1;
      if (bd != null) return 1;
      return (b.score ?? 0) - (a.score ?? 0);
    });
  }
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
};

/* =========================
   🧠 КОМПОНЕНТ
   ========================= */

const ContentHub = ({
  items,
  debugEnabled = false,
  interestsError,
  availableProviders,
}: ContentHubProps) => {
  /* 🔒 ЖЁСТКО: провайдеры НЕ зависят от items */
  const providerOptions = availableProviders.length > 0 ? availableProviders : ALL_PROVIDERS;

  const [activeType, setActiveType] = useState<ContentType | "all">("all");
  const [selectedProviders, setSelectedProviders] =
    useState<ContentProviderId[]>(providerOptions);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [seedNonce, setSeedNonce] = useState(0);

  const randomSeed = useMemo(
    () => buildSeed(`${items.map((i) => i.id).join("|")}|${seedNonce}`),
    [items, seedNonce],
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const filteredItems = useMemo(() => {
    const byProvider =
      selectedProviders.length === 0
        ? []
        : items.filter((i) => selectedProviders.includes(i.provider));
    const byType =
      activeType === "all" ? byProvider : byProvider.filter((i) => i.type === activeType);
    if (!debouncedSearch) return byType;
    const q = debouncedSearch.toLowerCase();
    return byType.filter((i) =>
      `${i.title} ${i.description ?? ""}`.toLowerCase().includes(q),
    );
  }, [items, selectedProviders, activeType, debouncedSearch]);

  const sortedItems = useMemo(
    () => sortItems(filteredItems, sort, randomSeed),
    [filteredItems, sort, randomSeed],
  );

  const handleReset = () => {
    setActiveType("all");
    setSelectedProviders(providerOptions);
    setSort("relevance");
    setSearch("");
    setDebouncedSearch("");
    setSeedNonce((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <ContentToolbar
        activeType={activeType}
        onTypeChange={setActiveType}
        providerOptions={providerOptions.map((id) => ({
          id,
          label: providerLabels[id] ?? id,
        }))}
        selectedProviders={selectedProviders}
        onProvidersChange={setSelectedProviders}
        sort={sort}
        onSortChange={setSort}
        search={search}
        onSearchChange={setSearch}
        onReset={handleReset}
        hasActiveFilters={
          activeType !== "all" ||
          search.trim() !== "" ||
          sort !== "relevance" ||
          selectedProviders.length !== providerOptions.length
        }
      />

      {!interestsError && sortedItems.length > 0 && (
        <ContentGrid items={sortedItems} activeType={activeType} debugEnabled={debugEnabled} />
      )}
    </div>
  );
};

export default ContentHub;
