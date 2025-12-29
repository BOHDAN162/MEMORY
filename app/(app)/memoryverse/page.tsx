import { PlaceholderCard } from "@/components/common/placeholder-card";

const MemoryversePage = () => {
  return (
    <PlaceholderCard
      title="Метавселенная памяти"
      description={[
        "Будущая библиотека и история прогресса: статус контента, XP и достижения.",
        "Позже добавим визуализацию прогресса и косметику профиля.",
        "Сейчас это контрольная точка для навигации и темы.",
      ]}
      status="MVP step: planned"
      primaryCta={{ href: "/map", label: "Back to Map" }}
      secondaryCta={{ href: "/community", label: "Go to Community" }}
    />
  );
};

export default MemoryversePage;
