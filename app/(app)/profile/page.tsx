import { ProfileGamification } from "@/components/features/gamification/profile-gamification";
import { TelegramSection } from "@/components/features/profile/telegram-section";
import { PlaceholderCard } from "@/components/features/placeholder-card";
import { buttonVariants } from "@/components/ui/button";
import { personalityTypeMap } from "@/lib/config/personality-types";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase/server";
import { getOrCreateUserProfile } from "@/lib/server/user-profile";
import type { PersonalityTypeId } from "@/lib/types/personality";
import Link from "next/link";

type ProfileData = {
  email: string | null;
  telegramUsername: string | null;
  personalityType: PersonalityTypeId | "pending" | null;
  error: string | null;
};

const loadProfileData = async (): Promise<ProfileData> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      email: null,
      telegramUsername: null,
      personalityType: null,
      error: "Supabase client is not configured. Check environment variables.",
    };
  }

  const session = await getServerSession();

  const { data: authUser, error: authError } = await supabase.auth.getUser();
  const email = session?.user.email ?? authUser?.user?.email ?? null;

  if (authError || !authUser?.user) {
    return { email, telegramUsername: null, personalityType: null, error: "Не удалось загрузить профиль." };
  }

  const { data: profile, error: profileError } = await getOrCreateUserProfile(
    supabase,
    authUser.user,
  );

  return {
    email,
    telegramUsername: profile?.telegram_username ?? null,
    personalityType: (profile?.personality_type as PersonalityTypeId | "pending" | null) ?? null,
    error: profileError,
  };
};

const ProfilePage = async () => {
  const profileData = await loadProfileData();
  const personalityDetails =
    profileData.personalityType && profileData.personalityType !== "pending"
      ? personalityTypeMap[profileData.personalityType as PersonalityTypeId] ?? null
      : null;

  return (
    <div className="space-y-6">
      <ProfileGamification />
      <TelegramSection
        initialUsername={profileData.telegramUsername}
        email={profileData.email}
        loadError={profileData.error}
      />
      <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-primary">Персонализация</p>
              <h2 className="text-2xl font-semibold">Улучшить персонализацию</h2>
              <p className="text-sm text-muted-foreground">
                Пройди короткий тест из 5 вопросов — подберём рекомендации точнее.
              </p>
            </div>
            <Link className={buttonVariants({ variant: "primary", size: "sm" })} href="/profile/personality">
              Пройти тест
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-background/50 p-4 shadow-inner shadow-black/5">
            {personalityDetails ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Твой тип</p>
                  <p className="text-xl font-semibold">{personalityDetails.title}</p>
                  <p className="text-sm text-muted-foreground">{personalityDetails.slogan}</p>
                </div>
                <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/profile/personality">
                  Пройти тест ещё раз
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Твой тип</p>
                  <p className="text-sm text-muted-foreground">Пройди тест, чтобы узнать тип</p>
                </div>
                <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/profile/personality">
                  Пройти тест
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
      <PlaceholderCard
        title="Профиль"
        description={[
          "Профиль будет показывать выбранные интересы, прогресс и подключенные аккаунты.",
          "Позже здесь появятся настройки приватности, ссылка на публичную карту и XP.",
          "Сейчас раздел нужен для проверки Shell и переключения тем.",
        ]}
        status="MVP step: planned"
        primaryCta={{ href: "/settings", label: "Go to Settings" }}
        secondaryCta={{ href: "/map", label: "Back to Map" }}
      />
    </div>
  );
};

export default ProfilePage;
