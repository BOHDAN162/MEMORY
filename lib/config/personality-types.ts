import type { PersonalityType, PersonalityTypeId } from "@/lib/types/personality";

export const personalityTypes: PersonalityType[] = [
  {
    typeId: "strategist",
    title: "Стратег",
    slogan: "«Вижу на несколько шагов вперёд»",
    strengths: ["Планируешь заранее", "Думаешь на несколько шагов вперёд", "Собираешь стратегию"],
  },
  {
    typeId: "practitioner",
    title: "Практик",
    slogan: "«Делаю и развиваю»",
    strengths: ["Делаешь по шагам", "Доводишь до результата", "Учишься через практику"],
  },
  {
    typeId: "explorer",
    title: "Исследователь",
    slogan: "«Изучаю досконально и глубоко»",
    strengths: ["Копаешь глубоко", "Любишь разбираться", "Собираешь факты"],
  },
  {
    typeId: "creator",
    title: "Создатель",
    slogan: "«Воссоздаю новое»",
    strengths: ["Придумываешь новое", "Собираешь идеи", "Творишь и тестируешь"],
  },
  {
    typeId: "communicator",
    title: "Коммуникатор",
    slogan: "«Объединяю людей»",
    strengths: ["Объединяешь людей", "Договариваешься", "Ведёшь и вдохновляешь"],
  },
  {
    typeId: "generalist",
    title: "Универсал",
    slogan: "«Адаптируюсь и собираю пазлы»",
    strengths: ["Быстро адаптируешься", "Собираешь пазлы", "Гибко переключаешься"],
  },
];

export const personalityTypeMap: Record<PersonalityTypeId, PersonalityType> = personalityTypes.reduce(
  (acc, personality) => {
    acc[personality.typeId] = personality;
    return acc;
  },
  {} as Record<PersonalityTypeId, PersonalityType>,
);
