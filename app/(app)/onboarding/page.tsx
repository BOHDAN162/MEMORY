import { InterestSelector } from "@/components/features/interests/interest-selector";
import { ONBOARDING_CLUSTER_ORDER, ONBOARDING_MIN_INTERESTS, selectAnchoredInterests } from "@/lib/config/onboarding";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInterests, getUserInterests } from "@/lib/server/interests";
import { getOrCreateUserProfile } from "@/lib/server/user-profile";
import type { Interest } from "@/lib/types/interests";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const fetchData = async (): Promise<{
  interests: Interest[];
  interestsError: string | null;
  userInterests: string[];
  userInterestsError: string | null;
}> => {
  const [{ data: interests, error: interestsError }, userInterestsResponse] = await Promise.all([
    getInterests(),
    getUserInterests(),
  ]);

  return {
    interests: interests ?? [],
    interestsError,
    userInterests: userInterestsResponse.data ?? [],
    userInterestsError: userInterestsResponse.error,
  };
};

const LoadingState = () => (
  <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">Onboarding</p>
        <div className="h-6 w-48 animate-pulse rounded bg-muted/60" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
    </div>
    <p className="text-sm text-muted-foreground">Загрузка интересов...</p>
  </section>
);

const OnboardingContent = async () => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <section
        id="interests"
        className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300"
      >
        <p className="text-sm text-destructive">
          Supabase client is not configured. Проверьте переменные окружения.
        </p>
      </section>
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    redirect("/auth");
  }

  const { data: profile, error: profileError } = await getOrCreateUserProfile(
    supabase,
    userData.user,
  );

  if (profileError || !profile) {
    return (
      <section
        id="interests"
        className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300"
      >
        <p className="text-sm text-destructive">Не удалось загрузить профиль пользователя: {profileError}</p>
      </section>
    );
  }

  const onboardingData = await fetchData();

  if (onboardingData.userInterests.length > 0) {
    redirect("/map");
  }

  const { interests, interestsError, userInterests, userInterestsError } = onboardingData;
  const anchoredInterests = selectAnchoredInterests(interests);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary">Onboarding</p>
            <h2 className="text-2xl font-semibold">Быстрый старт: выбери интересы</h2>
            <p className="text-sm text-muted-foreground">
              Минимум {ONBOARDING_MIN_INTERESTS} интереса, чтобы собрать для тебя карту. Можно менять в любой момент.
            </p>
          </div>
        </div>

        {interestsError ? (
          <p className="text-sm text-destructive">
            Не удалось загрузить список интересов: {interestsError}
          </p>
        ) : null}

        {userInterestsError ? (
          <p className="text-sm text-destructive">
            Не удалось загрузить выбранные интересы: {userInterestsError}
          </p>
        ) : null}

        {anchoredInterests.length > 0 ? (
          <InterestSelector
            interests={anchoredInterests}
            initialSelected={userInterests}
            minimumSelected={ONBOARDING_MIN_INTERESTS}
            selectionHint="Выбери минимум 3 интереса, чтобы продолжить"
            onSuccessRedirect="/map"
            submitLabel="Продолжить к карте"
            groupByCluster
            clusterOrder={ONBOARDING_CLUSTER_ORDER}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Список интересов пуст. Проверьте таблицу public.interests в Supabase.
          </p>
        )}
      </section>
    </div>
  );
};

const OnboardingPage = () => {
  return (
    <Suspense fallback={<LoadingState />}>
      <OnboardingContent />
    </Suspense>
  );
};

export default OnboardingPage;
