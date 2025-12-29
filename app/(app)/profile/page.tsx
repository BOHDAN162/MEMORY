import { PlaceholderCard } from "@/components/features/placeholder-card";

const ProfilePage = () => {
  return (
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
  );
};

export default ProfilePage;
