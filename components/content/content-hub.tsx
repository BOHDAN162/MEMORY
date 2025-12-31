"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ContentGrid from "@/components/content/ContentGrid";
import ContentToolbar from "@/components/content/ContentToolbar";
import type { ContentProviderId, ContentType, ContentItem } from "@/lib/server/content/types";
import { cn } from "@/lib/utils/cn";

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
};

type SortOption = "relevance" | "new" | "random" | "title";

type ContentHubProps = {
  items: NormalizedContentItem[];
  selectionMode: "selected" | "all";
  interestIds: string[];
  debug?: ContentDebugInfo | null;
  debugEnabled?: boolean;
  interestsError?: string | null;
};

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

const isFilterActive = (
  activeType: ContentType | "all",
  selectedProviders: ContentProviderId[],
  providerOptions: ContentProviderId[],
  search: string,
  sort: SortOption,
) => {
  if (activeType !== "all") return true;
  if (selectedProviders.length !== providerOptions.length) return true;
  if (search.trim()) return true;
  if (sort !== "relevance") return true;
  return false;
};

const getProviderErrors = (debug?: ContentDebugInfo | null) =>
  debug?.providers
    ? Object.entries(debug.providers)
        .filter(([, info]) => info?.error)
        .map(([provider, info]) => ({ provider, error: info?.error ?? null }))
    : [];

const getDateValue = (item: NormalizedContentItem): number | null => {
  if (item.sortableDate !== undefined && item.sortableDate !== null) {
    return item.sortableDate;
  }

  if (item.publishedAt) {
    const ms = new Date(item.publishedAt).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  if (item.createdAt) {
    const ms = new Date(item.createdAt).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  if (item.publishedYear) {
    const ms = new Date(item.publishedYear, 0, 1).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  return null;
};

const sortItems = (items: NormalizedContentItem[], sort: SortOption, randomSeed: number) => {
  if (sort === "random") {
    return shuffle(items, randomSeed);
  }

  const copy = [...items];
  if (sort === "title") {
    return copy.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  }

  if (sort === "new") {
    return copy.sort((a, b) => {
      const aDate = getDateValue(a);
      const bDate = getDateValue(b);
      if (aDate !== null && bDate !== null) {
        if (aDate === bDate) return 0;
        return bDate - aDate;
      }
      if (aDate !== null) return -1;
      if (bDate !== null) return 1;
      const aScore = a.score ?? 0;
      const bScore = b.score ?? 0;
      return bScore - aScore;
    });
  }

  return copy.sort((a, b) => {
    const aScore = a.score ?? 0;
    const bScore = b.score ?? 0;
    if (aScore === bScore) return 0;
    return bScore - aScore;
  });
};

const providerLabels: Record<ContentProviderId, string> = {
  youtube: "YouTube",
  books: "Books",
  articles: "Articles",
  telegram: "Telegram",
  prompts: "Prompts",
};

const buildProviderOptions = (items: NormalizedContentItem[]): ContentProviderId[] => {
  const unique = new Set<ContentProviderId>();
  items.forEach((item) => unique.add(item.provider));
  return Array.from(unique);
};

const emptyStates = {
  noInterests: {
    title: "Интересы не выбраны",
    description: "Выберите интересы, чтобы собрать подборку контента.",
    cta: { href: "/map", label: "Перейти к карте интересов" },
  },
  filteredOut: {
    title: "Ничего не найдено по фильтрам",
    description: "Попробуйте изменить фильтры или поиск.",
  },
  noContent: {
    title: "Контента пока нет",
    description: "Провайдеры вернули пустой список. Попробуйте позже.",
  },
};

const DebugPanel = ({ debug }: { debug: ContentDebugInfo }) => {
  const providerEntries = Object.entries(debug.providers ?? {});
  return (
    <details className="group rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground shadow-inner shadow-black/5">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-primary">
        Debug
      </summary>
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full bg-muted px-2 py-1">providers: {providerEntries.length}</span>
          <span className="rounded-full bg-muted px-2 py-1">
            cache hits: {Object.values(debug.cacheHits ?? {}).filter(Boolean).length}
          </span>
        </div>
        {providerEntries.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-background/60">
            <div className="grid grid-cols-5 gap-2 border-b border-border/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span>Provider</span>
              <span>Count</span>
              <span>Cache</span>
              <span>Latency</span>
              <span>Error</span>
            </div>
            <div className="divide-y divide-border/80 text-xs">
              {providerEntries.map(([provider, info]) => (
                <div key={provider} className="grid grid-cols-5 items-center gap-2 px-3 py-2">
                  <span className="font-semibold text-foreground">{providerLabels[provider as ContentProviderId] ?? provider}</span>
                  <span>{info?.count ?? 0}</span>
                  <span className="text-muted-foreground">{info?.cacheHit ? "yes" : "no"}</span>
                  <span className="text-muted-foreground">{info?.ms ? `${info.ms}ms` : "—"}</span>
                  <span className={cn("text-muted-foreground", info?.error && "text-destructive")}>
                    {info?.error ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
};

const ContentHub = ({
  items,
  selectionMode,
  interestIds,
  debug,
  debugEnabled = false,
  interestsError,
}: ContentHubProps) => {
  const router = useRouter();
  const providerOptions = useMemo(() => buildProviderOptions(items), [items]);
  const [activeType, setActiveType] = useState<ContentType | "all">("all");
  const [selectedProviders, setSelectedProviders] = useState<ContentProviderId[]>(providerOptions);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [randomSeed, setRandomSeed] = useState(() => buildSeed(items.map((item) => item.id).join("|")));

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setSelectedProviders(providerOptions);
  }, [providerOptions]);

  useEffect(() => {
    setRandomSeed(buildSeed(items.map((item) => item.id).join("|")));
  }, [items]);

  const filteredItems = useMemo(() => {
    const providerFiltered =
      selectedProviders.length === 0 ? [] : items.filter((item) => selectedProviders.includes(item.provider));
    const typeFiltered =
      activeType === "all" ? providerFiltered : providerFiltered.filter((item) => item.type === activeType);
    if (!debouncedSearch) return typeFiltered;
    const query = debouncedSearch.toLowerCase();
    return typeFiltered.filter((item) => {
      const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [activeType, debouncedSearch, items, selectedProviders]);

  const sortedItems = useMemo(
    () => sortItems(filteredItems, sort, randomSeed),
    [filteredItems, sort, randomSeed],
  );

  const hasFilters = isFilterActive(activeType, selectedProviders, providerOptions, debouncedSearch, sort);
  const providerErrors = getProviderErrors(debug);

  const handleReset = () => {
    setActiveType("all");
    setSelectedProviders(providerOptions);
    setSort("relevance");
    setSearch("");
    setDebouncedSearch("");
    setRandomSeed(buildSeed(items.map((item) => item.id).join("|")));
  };

  const showNoInterests = selectionMode === "all" && interestIds.length === 0 && !interestsError;
  const showFilteredEmpty = !showNoInterests && sortedItems.length === 0 && items.length > 0;
  const showNoContent = items.length === 0 && !showNoInterests && !interestsError;

  return (
    <div className="space-y-6">
      <ContentToolbar
        activeType={activeType}
        onTypeChange={setActiveType}
        providerOptions={providerOptions.map((id) => ({ id, label: providerLabels[id] ?? id }))}
        selectedProviders={selectedProviders}
        onProvidersChange={setSelectedProviders}
        sort={sort}
        onSortChange={setSort}
        search={search}
        onSearchChange={setSearch}
        onReset={handleReset}
        hasActiveFilters={hasFilters}
      />

      {interestsError ? (
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-destructive shadow-sm shadow-destructive/20">
          <h3 className="text-lg font-semibold">Не удалось загрузить интересы</h3>
          <p className="mt-2 text-sm text-destructive/80">{interestsError}</p>
          <button
            type="button"
            className="mt-4 inline-flex items-center rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-sm transition hover:bg-destructive/90"
            onClick={() => router.refresh()}
          >
            Повторить
          </button>
        </div>
      ) : null}

      {providerErrors.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-900 shadow-sm shadow-amber-500/20 dark:text-amber-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-base font-semibold">Часть провайдеров вернула ошибку</p>
              <p className="text-sm opacity-80">Мы сохранили результаты от остальных провайдеров.</p>
            </div>
            <button
              type="button"
              className="rounded-xl border border-amber-500/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-900 transition hover:bg-amber-500/20 dark:text-amber-100"
              onClick={() => router.refresh()}
            >
              Повторить
            </button>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            {providerErrors.map((error) => (
              <p key={error.provider} className="flex items-center gap-2">
                <span className="rounded-full bg-amber-500/30 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {providerLabels[error.provider as ContentProviderId] ?? error.provider}
                </span>
                <span className="text-amber-900/80 dark:text-amber-100/80">{error.error}</span>
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {showNoInterests ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center shadow-inner shadow-black/5">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Контент</p>
          <h3 className="mt-2 text-2xl font-semibold text-foreground">{emptyStates.noInterests.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{emptyStates.noInterests.description}</p>
          <a
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition hover:bg-primary/90"
            href={emptyStates.noInterests.cta.href}
          >
            {emptyStates.noInterests.cta.label}
          </a>
        </div>
      ) : null}

      {showFilteredEmpty ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center shadow-inner shadow-black/5">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Фильтры</p>
          <h3 className="mt-2 text-2xl font-semibold text-foreground">{emptyStates.filteredOut.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{emptyStates.filteredOut.description}</p>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
              onClick={handleReset}
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      ) : null}

      {showNoContent ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center shadow-inner shadow-black/5">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Провайдеры</p>
          <h3 className="mt-2 text-2xl font-semibold text-foreground">{emptyStates.noContent.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{emptyStates.noContent.description}</p>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
              onClick={() => router.refresh()}
            >
              Повторить
            </button>
          </div>
        </div>
      ) : null}

      {!showNoInterests && sortedItems.length > 0 ? (
        <ContentGrid items={sortedItems} activeType={activeType} debugEnabled={debugEnabled} />
      ) : null}

      {debugEnabled && debug ? <DebugPanel debug={debug} /> : null}
    </div>
  );
};

export default ContentHub;
