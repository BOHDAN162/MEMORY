export type Interest = {
  key: string;
  label: string;
  category: string;
};

export const interests: Interest[] = [
  { key: "startups", label: "Стартапы", category: "Бизнес" },
  { key: "entrepreneurship", label: "Предпринимательство", category: "Бизнес" },
  { key: "product", label: "Продуктовый менеджмент", category: "Бизнес" },
  { key: "investing", label: "Инвестиции", category: "Финансы" },
  { key: "personal-finance", label: "Личные финансы", category: "Финансы" },
  { key: "leadership", label: "Лидерство", category: "Саморазвитие" },
  { key: "psychology", label: "Психология", category: "Саморазвитие" },
  { key: "memory", label: "Навыки памяти", category: "Саморазвитие" },
  { key: "learning", label: "Образование", category: "Саморазвитие" },
  { key: "art", label: "Искусство", category: "Культура" },
  { key: "philosophy", label: "Философия", category: "Культура" },
  { key: "music", label: "Музыка", category: "Культура" },
  { key: "cinema", label: "Кино", category: "Культура" },
  { key: "science", label: "Наука", category: "Наука" },
  { key: "space", label: "Космос", category: "Наука" },
  { key: "technology", label: "Технологии", category: "Технологии" },
  { key: "ai", label: "ИИ/ML", category: "Технологии" },
  { key: "security", label: "Кибербезопасность", category: "Технологии" },
  { key: "history", label: "История", category: "История" },
  { key: "fiction", label: "Фантастика", category: "Фантастика/книги" },
];

export const interestCategories = Array.from(
  new Set(interests.map((interest) => interest.category)),
);

export const interestsByCategory = interestCategories.map((category) => ({
  category,
  items: interests.filter((interest) => interest.category === category),
}));

export function getInterestsByKeys(keys: string[]) {
  return interests.filter((interest) => keys.includes(interest.key));
}
