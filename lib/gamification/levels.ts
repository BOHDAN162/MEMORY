import type { LevelProgress } from "./types";

export const getXpForNextLevel = (level: number): number => {
  if (level < 1) return 0;
  return 100 + (level - 1) * 50;
};

export const getTotalXpForLevel = (level: number): number => {
  if (level <= 1) return 0;

  let total = 0;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += getXpForNextLevel(currentLevel);
  }

  return total;
};

export const getLevelFromXp = (xp: number): number => {
  if (xp <= 0) return 1;

  let level = 1;
  let remainingXp = xp;

  while (remainingXp >= getXpForNextLevel(level)) {
    remainingXp -= getXpForNextLevel(level);
    level += 1;
  }

  return level;
};

export const getProgressWithinLevel = (xp: number): LevelProgress => {
  const level = getLevelFromXp(xp);
  const xpForCurrentLevel = xp - getTotalXpForLevel(level);
  const nextLevelXp = getXpForNextLevel(level);
  const progress01 = nextLevelXp === 0 ? 0 : Math.min(1, xpForCurrentLevel / nextLevelXp);

  return {
    level,
    currentLevelXp: xpForCurrentLevel,
    nextLevelXp,
    progress01,
  };
};
