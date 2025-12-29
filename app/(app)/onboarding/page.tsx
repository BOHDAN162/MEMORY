import { PlaceholderCard } from "@/components/common/placeholder-card";

const OnboardingPage = () => {
  return (
    <PlaceholderCard
      title="Онбординг"
      description={[
        "После авторизации здесь появятся шаги с тестом личности и выбором интересов.",
        "Результаты будут влиять на карту и подборку контента.",
        "Сейчас это маршрут-заглушка, позволяющий проверить переходы внутри приложения.",
      ]}
      status="MVP step: planned"
      primaryCta={{ href: "/map", label: "Go to Map" }}
      secondaryCta={{ href: "/auth", label: "Back to Auth" }}
    />
  );
};

export default OnboardingPage;
