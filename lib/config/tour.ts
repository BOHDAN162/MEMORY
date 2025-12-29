export type TourStep = {
  id: string;
  title: string;
  description: string;
  selector: string;
  placement?: "top" | "bottom" | "left" | "right";
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "nav-map",
    title: "Карта интересов",
    description: "Здесь ты строишь карту интересов и выбираешь темы.",
    selector: '[data-tour="nav-map"]',
    placement: "right",
  },
  {
    id: "nav-content",
    title: "Контент",
    description: "Подборки контента под выбранные интересы.",
    selector: '[data-tour="nav-content"]',
    placement: "right",
  },
  {
    id: "nav-memoryverse",
    title: "Memoryverse",
    description: "История/библиотека: всё отмеченное попадает сюда.",
    selector: '[data-tour="nav-memoryverse"]',
    placement: "right",
  },
  {
    id: "nav-community",
    title: "Комьюнити",
    description: "Люди со схожими интересами и сравнение профилей.",
    selector: '[data-tour="nav-community"]',
    placement: "right",
  },
  {
    id: "nav-profile",
    title: "Профиль и прогресс",
    description: "Профиль, прогресс и настройки.",
    selector: '[data-tour="nav-profile"]',
    placement: "right",
  },
  {
    id: "nav-settings",
    title: "Настройки",
    description: "Профиль, прогресс и настройки.",
    selector: '[data-tour="nav-settings"]',
    placement: "right",
  },
  {
    id: "theme-toggle",
    title: "Переключатель темы",
    description: "Переключение темы (светлая/тёмная).",
    selector: '[data-tour="theme-toggle"]',
    placement: "left",
  },
];
