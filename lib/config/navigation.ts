export type NavigationItem = {
  title: string;
  href: string;
  hint: string;
};

export const navigationItems: NavigationItem[] = [
  { title: "Map", href: "/map", hint: "Карта интересов" },
  { title: "Content", href: "/content", hint: "Подбор контента" },
  { title: "Memoryverse", href: "/memoryverse", hint: "История и библиотека" },
  { title: "Community", href: "/community", hint: "Комьюнити и профили" },
  { title: "Profile", href: "/profile", hint: "Профиль пользователя" },
  { title: "Settings", href: "/settings", hint: "Настройки" },
  { title: "Admin", href: "/admin", hint: "Администрирование" },
];
