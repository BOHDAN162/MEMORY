import { PlaceholderCard } from "@/components/features/placeholder-card";

const AdminPage = () => {
  return (
    <PlaceholderCard
      title="Админка"
      description={[
        "Минимальный административный кабинет появится здесь: модерация контента и управление кешем.",
        "Позже добавим метрики по использованию карты и подборок.",
        "Сейчас раздел выступает заглушкой и проверкой корректных ссылок.",
      ]}
      status="MVP step: planned"
      primaryCta={{ href: "/map", label: "Back to Map" }}
      secondaryCta={{ href: "/content", label: "Go to Content" }}
    />
  );
};

export default AdminPage;
