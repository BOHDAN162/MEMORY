"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MemoryMap } from "@/components/shared/memory-map";
import { InterestChip } from "@/components/shared/interest-chip";
import { Modal } from "@/components/shared/modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { interests } from "@/lib/interests";
import {
  defaultProfile,
  findInterestLabel,
  type ProfileType,
} from "@/lib/profile";
import {
  type MemoryState,
  loadMemoryState,
  persistContentFilters,
} from "@/lib/storage";

const initialState: MemoryState = {
  hasOnboarded: false,
  selectedInterests: [],
  profileType: null,
  contentFilters: [],
};

export default function MemoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted">
          Загружаем карту интересов…
        </div>
      }
    >
      <MemoryPageContent />
    </Suspense>
  );
}

function MemoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<MemoryState>(initialState);
  const [filters, setFilters] = useState<string[]>([]);
  const [clientReady, setClientReady] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = loadMemoryState();
    const nextProfile = stored.profileType ?? defaultProfile;
    const nextFilters = stored.contentFilters.length
      ? stored.contentFilters
      : stored.selectedInterests;

    setState({ ...stored, profileType: nextProfile });
    setFilters(nextFilters);
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return;

    if (!state.hasOnboarded) {
      router.replace("/onboarding");
      return;
    }

    const shouldOpen = searchParams.get("filters") === "1";
    setFiltersOpen(shouldOpen);
  }, [clientReady, router, searchParams, state.hasOnboarded]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const profile: ProfileType = state.profileType ?? defaultProfile;

  const selectedInterestsList = useMemo(
    () =>
      state.selectedInterests
        .map((key) => interests.find((item) => item.key === key))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [state.selectedInterests],
  );

  const toggleFilter = (key: string) => {
    setFilters((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const handleShowContent = () => {
    const appliedFilters = filters.length ? filters : state.selectedInterests;
    const next = persistContentFilters(appliedFilters);
    setState((prev) => ({ ...prev, contentFilters: next }));
    router.push("/content");
  };

  const selectedFiltersLabel = filters.length
    ? filters.map((key) => findInterestLabel(key)).join(" · ")
    : "Авто по интересам";

  return (
    <div className="relative min-h-screen bg-background px-4 pb-12 pt-10">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_30%_10%,rgba(124,91,255,0.2),transparent_35%)] blur-3xl" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">MEMORY</p>
            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
              Метавселенная памяти
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted">
              Карта интересов обновлена под твой профиль. Управляй фильтрами и
              отправляйся за подборкой контента.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr,1.4fr]">
          <div className="space-y-4 rounded-3xl border border-border/70 bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  Твой профиль
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-foreground">
                  {profile.title}
                </h3>
                <p className="mt-2 text-muted">{profile.description}</p>
              </div>
              <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs text-muted">
                {state.selectedInterests.length} интересов
              </span>
            </div>
            <div className="rounded-2xl bg-surface-strong/90 p-4 text-sm text-muted backdrop-blur">
              <p>Текущие фильтры: {selectedFiltersLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-muted">
              {selectedInterestsList.map((interest) => (
                <span
                  key={interest.key}
                  className="rounded-full bg-surface-strong px-3 py-1"
                >
                  {interest.label}
                </span>
              ))}
            </div>
            <Button onClick={() => setFiltersOpen(true)} className="w-full">
              Подобрать контент
            </Button>
          </div>

          <div>
            <MemoryMap
              selectedInterests={state.selectedInterests}
              className="h-full min-h-[500px]"
            />
          </div>
        </div>
      </div>

      <Modal
        open={filtersOpen && clientReady}
        onClose={() => setFiltersOpen(false)}
        title="Подобрать контент"
        description="Выбери интересы, по которым нужна свежая подборка."
        wide
      >
        {selectedInterestsList.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedInterestsList.map((interest) => (
              <InterestChip
                key={interest.key}
                interest={interest}
                active={filters.includes(interest.key)}
                onToggle={toggleFilter}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Нет сохранённых интересов. Вернись к онбордингу и собери карту.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Выбрано {filters.length || selectedInterestsList.length} фильтров.
            Можно оставить все — мы возьмём твои интересы по умолчанию.
          </p>
          <Button
            onClick={handleShowContent}
            disabled={!selectedInterestsList.length}
            className="min-w-44"
          >
            Показать контент
          </Button>
        </div>
      </Modal>
    </div>
  );
}
