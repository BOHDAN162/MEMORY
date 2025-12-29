import type { Badge, BadgeDefinition } from "./types";

const badgeCatalog: BadgeDefinition[] = [
  {
    id: "first-login",
    title: "Первый вход",
    description: "Зашёл в приложение и начал путь",
    icon: "🚀",
    unlockRule: "Первый визит в приложение",
  },
  {
    id: "profile-complete",
    title: "Заполнил профиль",
    description: "Добавил ключевую информацию о себе",
    icon: "🧩",
    unlockRule: "Заполнить основные поля профиля",
  },
  {
    id: "interests-five",
    title: "Выбрал 5 интересов",
    description: "Определил базовые интересы",
    icon: "🎯",
    unlockRule: "Выбрать минимум 5 интересов",
  },
  {
    id: "map-build",
    title: "Построил карту",
    description: "Создал свою первую карту знаний",
    icon: "🗺️",
    unlockRule: "Построить хотя бы одну карту",
  },
  {
    id: "content-save",
    title: "Сохранил первый контент",
    description: "Сохранил материал или заметку",
    icon: "📚",
    unlockRule: "Сохранить первый контент",
  },
  {
    id: "streak-7",
    title: "7 дней подряд",
    description: "Возвращался каждый день в течение недели",
    icon: "🔥",
    unlockRule: "Держать стрик 7 дней",
  },
];

export const getBadgeCatalog = (): BadgeDefinition[] => badgeCatalog;

export const getBadgesWithState = (unlockedBadges: string[]): Badge[] =>
  badgeCatalog.map((badge) => ({
    ...badge,
    isUnlocked: unlockedBadges.includes(badge.id),
  }));
