export type XpEventType =
  | "COMPLETE_CONTENT"
  | "SELECT_INTEREST"
  | "FINISH_ONBOARDING"
  | "UPDATE_PROFILE"
  | "CUSTOM";

export type XpEvent = {
  type: XpEventType;
  delta: number;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type GamificationState = {
  xp: number;
  events: XpEvent[];
  unlockedBadges: string[];
  updatedAt: string;
};

export type BadgeDefinition = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockRule?: string;
};

export type Badge = BadgeDefinition & {
  isUnlocked: boolean;
};

export type LevelProgress = {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress01: number;
};
