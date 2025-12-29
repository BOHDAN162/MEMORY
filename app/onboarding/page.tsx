"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { MemoryMap } from "@/components/shared/memory-map";
import { InterestChip } from "@/components/shared/interest-chip";
import { Modal } from "@/components/shared/modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { interests } from "@/lib/interests";
import { resolveProfileType, type ProfileType } from "@/lib/profile";
import { loadMemoryState, persistOnboarding } from "@/lib/storage";

export default function OnboardingPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [showModal, setShowModal] = useState(true);
  const [showResult, setShowResult] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const state = loadMemoryState();
    setSelectedInterests(state.selectedInterests);
    setProfile(state.profileType);
    setShowModal(!state.hasOnboarded);
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectionCount = selectedInterests.length;

  const toggleInterest = (key: string) => {
    setSelectedInterests((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const handleContinue = () => {
    if (!selectedInterests.length) return;
    const nextProfile = resolveProfileType(selectedInterests);
    setProfile(nextProfile);
    persistOnboarding(selectedInterests, nextProfile);
    setShowResult(true);
  };

  const handleGoToMap = () => {
    setShowModal(false);
    router.push("/memory");
  };

  const chips = useMemo(
    () =>
      interests.map((interest) => (
        <InterestChip
          key={interest.key}
          interest={interest}
          active={selectedInterests.includes(interest.key)}
          onToggle={toggleInterest}
        />
      )),
    [selectedInterests],
  );

  return (
    <div className="relative min-h-screen bg-background px-4 pb-12 pt-10">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_40%_20%,rgba(124,91,255,0.2),transparent_35%)] blur-3xl" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">MEMORY</p>
            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
              Метавселенная памяти
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted">
              Собери свои интересы, чтобы MEMORY предложила маршрут и контент,
              который попадёт в цель.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setShowModal(true)}>
              Подобрать интересы
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr,1.4fr]">
          <div className="space-y-4 rounded-3xl border border-border/70 bg-surface p-6 shadow-xl">
            <div className="rounded-2xl bg-surface-strong/80 p-4 text-sm text-muted backdrop-blur">
              <p>
                При первом входе мы строим карту интересов. Всё хранится локально
                в браузере — без аккаунтов и бэкенда.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.2em] text-muted">
                Текущий профиль
              </p>
              <div className="rounded-2xl border border-border/60 bg-foreground/5 p-5">
                <h3 className="text-xl font-semibold text-foreground">
                  {profile ? profile.title : "Ещё не определён"}
                </h3>
                <p className="mt-2 text-muted">
                  {profile
                    ? profile.description
                    : "Выбери интересы, и мы покажем сильные стороны твоей траектории."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted">
                  <span className="rounded-full bg-surface-strong px-3 py-1">
                    {selectionCount ? `${selectionCount}/20` : "Нет"} интересов
                  </span>
                  <span className="rounded-full bg-surface-strong px-3 py-1">
                    Локальное хранение
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <MemoryMap
              selectedInterests={selectedInterests}
              className="h-full min-h-[480px]"
            />
          </div>
        </div>
      </div>

      <Modal
        open={showModal && hydrated}
        title="Подобрать интересы"
        description="Выбери, что откликается. Это поможет нам подсветить правильные связи на карте."
        wide
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {chips}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Выбрано {selectionCount} из 20. Можно менять в любой момент — данные
            остаются только у тебя.
          </p>
          {!showResult && (
            <Button
              onClick={handleContinue}
              disabled={!selectionCount}
              className="min-w-40"
            >
              Продолжить
            </Button>
          )}
        </div>

        {showResult && profile ? (
          <div className="mt-4 rounded-2xl border border-border/70 bg-gradient-to-r from-foreground/5 via-accent/10 to-surface-strong p-4 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Профиль</p>
            <h3 className="mt-1 text-2xl font-semibold text-foreground">
              {profile.title}
            </h3>
            <p className="mt-2 text-muted">{profile.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted">
              {selectedInterests.map((interestKey) => (
                <span
                  key={interestKey}
                  className="rounded-full bg-surface-strong px-3 py-1"
                >
                  {interests.find((item) => item.key === interestKey)?.label}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={handleGoToMap} className="min-w-48">
                Перейти к карте
              </Button>
              <Button variant="secondary" onClick={() => setShowResult(false)}>
                Выбрать заново
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
