import { InterestSelector } from "@/components/features/interests/interest-selector";
import { getDevUserId } from "@/lib/config/env";
import { getInterests, getUserInterests, setUserInterests } from "@/lib/server/interests";
import type { Interest } from "@/lib/types/interests";
import { revalidatePath } from "next/cache";

type ServerActionResult = {
  error: string | null;
  message?: string;
};

const fetchData = async (): Promise<{
  interests: Interest[];
  interestsError: string | null;
  userInterests: string[];
  userInterestsError: string | null;
}> => {
  const devUserId = getDevUserId();
  const [{ data: interests, error: interestsError }, userInterestsResponse] = await Promise.all([
    getInterests(),
    devUserId ? getUserInterests(devUserId) : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    interests: interests ?? [],
    interestsError,
    userInterests: userInterestsResponse.data ?? [],
    userInterestsError: userInterestsResponse.error,
  };
};

const saveUserInterests = async (formData: FormData): Promise<ServerActionResult> => {
  "use server";

  const devUserId = getDevUserId();

  if (!devUserId) {
    return {
      error:
        "Переменная NEXT_PUBLIC_DEV_USER_ID не задана. Добавьте её в .env или .env.local для dev.",
    };
  }

  const interestIds = formData.getAll("interestIds").map(String);
  const result = await setUserInterests(devUserId, interestIds);

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/onboarding");
  revalidatePath("/map");
  revalidatePath("/content");

  return { error: null, message: "Сохранено" };
};

const OnboardingPage = async () => {
  const devUserId = getDevUserId();
  const { interests, interestsError, userInterests, userInterestsError } = await fetchData();

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Onboarding</p>
          <h2 className="text-2xl font-semibold">Выбор интересов</h2>
          <p className="text-sm text-muted-foreground">
            Выберите интересы и сохраните их. Пока используется DEV User ID из окружения.
          </p>
        </div>
        {devUserId ? (
          <span className="text-xs text-muted-foreground">
            DEV_USER_ID: <span className="font-semibold">{devUserId}</span>
          </span>
        ) : (
          <span className="text-xs text-destructive">
            Установите NEXT_PUBLIC_DEV_USER_ID в .env, чтобы тестировать сохранение.
          </span>
        )}
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

      {interests.length > 0 ? (
        <InterestSelector
          interests={interests}
          initialSelected={userInterests}
          onSubmit={saveUserInterests}
          devUserIdHint="NEXT_PUBLIC_DEV_USER_ID не найден. Добавьте переменную в .env.local для дев-окружения."
          isUserReady={Boolean(devUserId)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Список интересов пуст. Проверьте таблицу public.interests в Supabase.
        </p>
      )}
    </section>
  );
};

export default OnboardingPage;
