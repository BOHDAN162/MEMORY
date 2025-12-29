import { PlaceholderCard } from "@/components/common/placeholder-card";

const CommunityPage = () => {
  return (
    <PlaceholderCard
      title="Комьюнити"
      description={[
        "Здесь появится сравнение карт по схожести интересов и публичные профили.",
        "Планируется контакт через Telegram username, если пользователь захочет его указать.",
        "Раздел готов к добавлению логики, пока выполняет роль навигационной заглушки.",
      ]}
      status="MVP step: planned"
      primaryCta={{ href: "/profile", label: "Go to Profile" }}
      secondaryCta={{ href: "/map", label: "Back to Map" }}
    />
  );
};

export default CommunityPage;
