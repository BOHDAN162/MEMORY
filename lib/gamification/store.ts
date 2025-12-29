import { getBadgeCatalog } from "./achievements";
import type { GamificationState, XpEvent, XpEventType } from "./types";

const STORAGE_KEY = "memory.gamification.v0";
const MAX_EVENTS = 50;

const getDefaultState = (): GamificationState => ({
  xp: 120,
  events: [
    {
      type: "FINISH_ONBOARDING",
      delta: 100,
      createdAt: new Date().toISOString(),
    },
    {
      type: "CUSTOM",
      delta: 20,
      createdAt: new Date().toISOString(),
    },
  ],
  unlockedBadges: ["first-login", "profile-complete"],
  updatedAt: new Date().toISOString(),
});

const safeParseState = (value: string | null): GamificationState | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as GamificationState;

    if (
      typeof parsed.xp !== "number" ||
      !Array.isArray(parsed.events) ||
      !Array.isArray(parsed.unlockedBadges)
    ) {
      return null;
    }

    return {
      ...parsed,
      xp: Math.max(0, parsed.xp),
      events: parsed.events.slice(0, MAX_EVENTS),
      unlockedBadges: parsed.unlockedBadges,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to parse gamification state", error);
    return null;
  }
};

export const loadGamificationState = (): GamificationState => {
  if (typeof window === "undefined") return getDefaultState();

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return safeParseState(stored) ?? getDefaultState();
  } catch (error) {
    console.error("Failed to load gamification state", error);
    return getDefaultState();
  }
};

export const saveGamificationState = (state: GamificationState): void => {
  if (typeof window === "undefined") return;

  try {
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error("Failed to save gamification state", error);
  }
};

const clampEvents = (events: XpEvent[]): XpEvent[] => events.slice(0, MAX_EVENTS);

export const addXp = (
  delta: number,
  eventType: XpEventType,
  meta?: Record<string, unknown>,
): GamificationState => {
  const currentState = loadGamificationState();
  const sanitizedDelta = Number.isFinite(delta) ? delta : 0;
  const nextXp = Math.max(0, Math.round(currentState.xp + sanitizedDelta));

  const newEvent: XpEvent = {
    type: eventType,
    delta: sanitizedDelta,
    meta,
    createdAt: new Date().toISOString(),
  };

  const catalog = getBadgeCatalog();
  const unlockedBadges = currentState.unlockedBadges.filter((id) =>
    catalog.some((badge) => badge.id === id),
  );

  const nextState: GamificationState = {
    ...currentState,
    xp: nextXp,
    events: clampEvents([newEvent, ...currentState.events]),
    unlockedBadges,
    updatedAt: new Date().toISOString(),
  };

  saveGamificationState(nextState);
  return nextState;
};

export const resetGamification = (): GamificationState => {
  const defaultState = getDefaultState();
  saveGamificationState(defaultState);
  return defaultState;
};
