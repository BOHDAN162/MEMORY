import { ProfileGamification } from "@/components/features/gamification/profile-gamification";
import { TelegramSection } from "@/components/features/profile/telegram-section";
import { PlaceholderCard } from "@/components/features/placeholder-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateUserProfile } from "@/lib/server/user-profile";

const loadTelegramUsername = async (): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: profile } = await getOrCreateUserProfile(supabase);

  return profile?.telegram_username ?? null;
};

const ProfilePage = async () => {
  const telegramUsername = await loadTelegramUsername();

  return (
    <div className="space-y-6">
      <ProfileGamification />
      <TelegramSection initialUsername={telegramUsername} />
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
