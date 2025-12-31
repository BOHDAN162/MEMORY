import { PersonalityQuiz } from "@/components/features/onboarding/personality-quiz";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateUserProfile } from "@/lib/server/user-profile";
import type { PersonalityAnswerFields } from "@/lib/types/personality";
import { redirect } from "next/navigation";

type PersonalityAnswerRow = {
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  q5: number | null;
};

type PersonalityData = {
  initialAnswers: PersonalityAnswerFields | null;
  loadError: string | null;
};

const loadPersonalityData = async (): Promise<PersonalityData> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      initialAnswers: null,
      loadError: "Supabase client is not configured. Проверьте переменные окружения.",
    };
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
    return {
      initialAnswers: null,
      loadError: profileError ?? "Не удалось загрузить профиль.",
    };
  }

  const { data: rawAnswers, error: answersError } = await supabase
    .from("personality_answers")
    .select("q1, q2, q3, q4, q5")
    .eq("user_id", profile.id)
    .maybeSingle<PersonalityAnswerRow>();

  const initialAnswers: PersonalityAnswerFields | null = rawAnswers
    ? {
        q1: rawAnswers.q1 ?? null,
        q2: rawAnswers.q2 ?? null,
        q3: rawAnswers.q3 ?? null,
        q4: rawAnswers.q4 ?? null,
        q5: rawAnswers.q5 ?? null,
      }
    : null;

  return {
    initialAnswers,
    loadError: answersError?.message ?? null,
  };
};

const ProfilePersonalityPage = async () => {
  const personalityData = await loadPersonalityData();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card/60 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Персонализация</p>
          <h1 className="text-3xl font-semibold">Короткий тест</h1>
          <p className="text-sm text-muted-foreground">
            Ответьте на 5 вопросов, чтобы улучшить рекомендации. После сохранения можно вернуться в профиль.
          </p>
        </div>
      </section>

      <PersonalityQuiz
        initialAnswers={personalityData.initialAnswers}
        loadError={personalityData.loadError}
        onCompleteRedirectPath="/profile"
        badge="Профиль"
        title="Тест личности"
        description="5 коротких вопросов помогут подобрать тебе маршруты и рекомендации."
        returnLabel="Вернуться в профиль"
      />
    </div>
  );
};

export default ProfilePersonalityPage;
