import { PlaceholderCard } from "@/components/features/placeholder-card";

const MapPage = () => {
  return (
    <PlaceholderCard
      title="Карта интересов"
      description={[
        "Здесь появится интерактивная карта с узлами и связями, которую можно будет перетаскивать и масштабировать.",
        "Мы добавим связь с персональными интересами, тестом личности и подборкой контента.",
        "В этом шаге важна стабильная оболочка и корректная навигация между разделами.",
      ]}
      status="MVP step: planned"
      primaryCta={{ href: "/content", label: "Go to Content" }}
      secondaryCta={{ href: "/onboarding", label: "Back to Onboarding" }}
    />
  );
};

export default MapPage;
