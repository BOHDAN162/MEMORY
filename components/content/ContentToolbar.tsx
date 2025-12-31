"use client";

import { ChevronDown, Filter, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ContentProviderId, ContentType } from "@/lib/server/content/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type ProviderOption = { id: ContentProviderId; label: string };

type ContentToolbarProps = {
  activeType: ContentType | "all";
  onTypeChange: (value: ContentType | "all") => void;
  providerOptions: ProviderOption[];
  selectedProviders: ContentProviderId[];
  onProvidersChange: (value: ContentProviderId[]) => void;
  sort: "relevance" | "new" | "random" | "title";
  onSortChange: (value: ContentToolbarProps["sort"]) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
};

const typeTabs: Array<{ key: ContentType | "all"; label: string }> = [
  { key: "all", label: "Все" },
  { key: "video", label: "Видео" },
  { key: "book", label: "Книги" },
  { key: "article", label: "Статьи" },
  { key: "channel", label: "Каналы" },
  { key: "prompt", label: "Промпты" },
];

const sortLabels: Record<ContentToolbarProps["sort"], string> = {
  relevance: "Релевантность",
  new: "Новые",
  random: "Случайно",
  title: "Название",
};

const ProvidersDropdown = ({
  options,
  value,
  onChange,
}: {
  options: ProviderOption[];
  value: ContentProviderId[];
  onChange: (next: ContentProviderId[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggle = (id: ContentProviderId) => {
    const exists = value.includes(id);
    if (exists) {
      onChange(value.filter((provider) => provider !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const allSelected = value.length === options.length;
  const displayLabel = allSelected
    ? "Все источники"
    : value
        .map((id) => options.find((option) => option.id === id)?.label ?? id)
        .sort((a, b) => a.localeCompare(b, "ru"))
        .join(", ");

  const reset = () => onChange(options.map((option) => option.id));

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className={cn(
          buttonVariants({ variant: "soft", size: "sm" }),
          "gap-2 border border-border/70 bg-background/60 text-xs font-semibold text-foreground shadow-inner shadow-black/5 hover:border-primary/40",
        )}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <Filter className="h-4 w-4" aria-hidden />
        {displayLabel || "Источники"}
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-border bg-card/90 p-3 text-sm shadow-lg shadow-black/10 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Источники</p>
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={reset}
            >
              Все
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {options.map((option) => {
              const checked = value.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    checked={checked}
                    onChange={() => toggle(option.id)}
                  />
                  <span className="text-foreground">{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const ContentToolbar = ({
  activeType,
  onTypeChange,
  providerOptions,
  selectedProviders,
  onProvidersChange,
  sort,
  onSortChange,
  search,
  onSearchChange,
  onReset,
  hasActiveFilters,
}: ContentToolbarProps) => {
  return (
    <div className="sticky top-4 z-10 space-y-3 rounded-2xl border border-border bg-card/80 p-4 shadow-[0_12px_60px_-32px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2">
        {typeTabs.map((tab) => {
          const isActive = activeType === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                "border border-transparent bg-transparent text-muted-foreground hover:text-foreground",
                isActive &&
                  "border border-primary/40 bg-primary/10 text-primary shadow-sm shadow-primary/20",
              )}
              aria-pressed={isActive}
              onClick={() => onTypeChange(tab.key)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            placeholder="Поиск по названию или описанию..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground shadow-inner shadow-black/5 placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="Поиск по контенту"
          />
        </div>

        <ProvidersDropdown
          options={providerOptions}
          value={selectedProviders}
          onChange={onProvidersChange}
        />

        <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-inner shadow-black/5">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden />
          <span className="hidden sm:inline">Сортировка</span>
          <select
            className="min-w-[140px] border-none bg-transparent text-sm font-semibold text-foreground focus:outline-none"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as ContentToolbarProps["sort"])}
            aria-label="Сортировка"
          >
            {Object.entries(sortLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-2 border border-border bg-background/70 text-xs font-semibold text-foreground shadow-inner shadow-black/5 hover:border-primary/40",
            !hasActiveFilters && "opacity-60",
          )}
          onClick={onReset}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Сбросить
        </button>
      </div>
    </div>
  );
};

export default ContentToolbar;
