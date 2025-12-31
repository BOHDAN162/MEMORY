import { ProfileGamification } from "@/components/features/gamification/profile-gamification";
import { TelegramSection } from "@/components/features/profile/telegram-section";
import { PlaceholderCard } from "@/components/features/placeholder-card";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase/server";
import { getOrCreateUserProfile } from "@/lib/server/user-profile";
import Link from "next/link";

type ProfileData = {
  email: string | null;
  telegramUsername: string | null;
  error: string | null;
};

const loadProfileData = async (): Promise<ProfileData> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      email: null,
      telegramUsername: null,
      error: "Supabase client is not configured. Check environment variables.",
    };
  }

  const session = await getServerSession();

  const { data: authUser, error: authError } = await supabase.auth.getUser();
  const email = session?.user.email ?? authUser?.user?.email ?? null;

  if (authError || !authUser?.user) {
    return { email, telegramUsername: null, error: "Не удалось загрузить профиль." };
  }

  const { data: profile, error: profileError } = await getOrCreateUserProfile(
    supabase,
    authUser.user,
  );

  return {
    email,
    telegramUsername: profile?.telegram_username ?? null,
    error: profileError,
  };
};

const ProfilePage = async () => {
  const profileData = await loadProfileData();

  return (
    <div className="space-y-6">
      <ProfileGamification />
      <TelegramSection
        initialUsername={profileData.telegramUsername}
        email={profileData.email}
        loadError={profileData.error}
      />
      <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
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
