import { PlaceholderCard } from "@/components/common/placeholder-card";

const SettingsPage = () => {
  return (
    <PlaceholderCard
      title="Настройки"
      description={[
        "Здесь будут переключатели тем, конфигурация уведомлений и подключение Telegram.",
        "Добавим управление Supabase сессией и ссылками для выхода.",
        "Раздел сейчас проверяет навигацию и базовую оболочку.",
      ]}
      status="MVP step: planned"
      primaryCta={{ href: "/map", label: "Back to Map" }}
      secondaryCta={{ href: "/admin", label: "Go to Admin" }}
    />
  );
};

export default SettingsPage;
