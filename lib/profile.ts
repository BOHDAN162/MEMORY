import { getInterestsByKeys, interests } from "./interests";

export type ProfileType = {
  key: string;
  title: string;
  description: string;
};

const strategistCategories = ["Бизнес", "Финансы"];
const creatorCategories = ["Культура", "История", "Фантастика/книги"];
const explorerCategories = ["Наука", "Технологии"];

export function resolveProfileType(selectedInterestKeys: string[]): ProfileType {
  if (!selectedInterestKeys.length) {
    return universalProfile;
  }

  const selectedCategories = getInterestsByKeys(selectedInterestKeys).map(
    (interest) => interest.category,
  );

  const score = {
    strategist: 0,
    creator: 0,
    explorer: 0,
  };

  selectedCategories.forEach((category) => {
    if (strategistCategories.includes(category)) {
      score.strategist += 2;
    }
    if (creatorCategories.includes(category)) {
      score.creator += 2;
    }
    if (explorerCategories.includes(category)) {
      score.explorer += 2;
    }
    // небольшое влияние общего интереса
    score.strategist += category === "Саморазвитие" ? 0.5 : 0;
    score.creator += category === "Саморазвитие" ? 0.5 : 0;
    score.explorer += category === "Саморазвитие" ? 0.5 : 0;
  });

  const maxScore = Math.max(score.strategist, score.creator, score.explorer);
  if (maxScore === score.strategist && maxScore > 0) {
    return strategistProfile;
  }
  if (maxScore === score.creator && maxScore > 0) {
    return creatorProfile;
  }
  if (maxScore === score.explorer && maxScore > 0) {
    return explorerProfile;
  }

  return universalProfile;
}

export const strategistProfile: ProfileType = {
  key: "strategist",
  title: "Стратег",
  description:
    "Собираешь связи между бизнесом и финансами, быстро собираешь команды и видишь точки роста.",
};

export const creatorProfile: ProfileType = {
  key: "creator",
  title: "Создатель",
  description:
    "Тянешься к культуре и смыслам, собираешь истории, упаковываешь идеи в эстетичный опыт.",
};

export const explorerProfile: ProfileType = {
  key: "explorer",
  title: "Исследователь",
  description:
    "Фокус на науке и технологиях, любишь экспериментировать, тестировать гипотезы и смотреть в будущее.",
};

export const universalProfile: ProfileType = {
  key: "universal",
  title: "Универсал",
  description:
    "Гибко переключаешься между темами, соединяешь людей и идеи, быстро обучаешься новому.",
};

export const defaultProfile = universalProfile;

export function findInterestLabel(key: string) {
  return interests.find((item) => item.key === key)?.label ?? key;
}
