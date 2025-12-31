import { ProfileGamification } from "@/components/features/gamification/profile-gamification";
import { TelegramSection } from "@/components/features/profile/telegram-section";
import { PlaceholderCard } from "@/components/features/placeholder-card";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase/server";
import { getOrCreateUserProfile } from "@/lib/server/user-profile";

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
