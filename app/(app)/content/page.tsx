import { PlaceholderCard } from "@/components/features/placeholder-card";

const ContentPage = () => {
  return (
    <PlaceholderCard
      title="Подбор контента"
      description={[
        "Здесь будет подборка видео, статей, книг и Telegram-каналов по выбранным интересам.",
        "Данные будут кешироваться и фильтроваться по статусам later/now/done.",
        "Пока раздел служит проверкой маршрутизации и темы оформления.",
      ]}
      status="MVP step: planned"
      primaryCta={{ href: "/map", label: "Back to Map" }}
      secondaryCta={{ href: "/memoryverse", label: "Go to Memoryverse" }}
    />
  );
};

export default ContentPage;
