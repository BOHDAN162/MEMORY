"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { interests } from "@/lib/interests";
import { findInterestLabel } from "@/lib/profile";
import { loadMemoryState } from "@/lib/storage";

type ContentCard = {
  title: string;
  source: string;
  duration: string;
  tags: string[];
};

export default function ContentPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const state = loadMemoryState();
    if (!state.hasOnboarded) {
      router.replace("/onboarding");
      return;
    }

    const activeFilters = state.contentFilters.length
      ? state.contentFilters
      : state.selectedInterests;

    setFilters(activeFilters);
    setSelectedInterests(state.selectedInterests);
    setReady(true);
  }, [router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const cards = useMemo(() => generateCards(filters, selectedInterests), [
    filters,
    selectedInterests,
  ]);

  const activeFilters = filters.length
    ? filters
    : selectedInterests.length
      ? selectedInterests
      : interests.slice(0, 6).map((item) => item.key);

  const activeFilterLabels = activeFilters.map((key) => findInterestLabel(key));

  return (
    <div className="relative min-h-screen bg-background px-4 pb-12 pt-10">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_70%_0%,rgba(124,91,255,0.16),transparent_35%)] blur-3xl" />
      <div className="relative mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">MEMORY</p>
            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
              Подборки контента
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted">
              Мы подсветили материалы под твои интересы. Фильтры можно менять в
              любой момент.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push("/memory?filters=1")}
            >
              Изменить фильтры
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <div className="rounded-3xl border border-border/70 bg-surface p-5 shadow-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            Активные фильтры
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted">
            {activeFilterLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-surface-strong px-3 py-1 text-foreground/80"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ready
            ? cards.map((card, index) => (
                <article
                  key={card.title + index}
                  className="group flex flex-col gap-3 rounded-3xl border border-border/70 bg-surface p-4 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_20px_60px_rgba(124,91,255,0.25)]"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
                    <span>{card.source}</span>
                    <span>{card.duration}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-sm text-muted">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-foreground/5 px-3 py-1 text-foreground/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            : Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-3xl border border-border/60 bg-surface-strong"
                />
              ))}
        </div>
      </div>
    </div>
  );
}

function generateCards(filters: string[], selectedInterests: string[]): ContentCard[] {
  const tagPool = filters.length
    ? filters
    : selectedInterests.length
      ? selectedInterests
      : interests.slice(0, 8).map((item) => item.key);

  return Array.from({ length: 12 }).map((_, index) => {
    const primaryTag = tagPool[index % tagPool.length];
    const label = findInterestLabel(primaryTag);

    return {
      title: `${label}: короткая подборка #${index + 1}`,
      source: "MEMORY · Подборка",
      duration: `${8 + (index % 6)} мин`,
      tags: [label, "фокус", index % 2 === 0 ? "вдохновение" : "практика"],
    };
  });
}
