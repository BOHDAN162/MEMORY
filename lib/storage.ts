import { ProfileType } from "./profile";
import { loadFromStorage, saveToStorage } from "./utils";

export const STORAGE_KEYS = {
  hasOnboarded: "hasOnboarded",
  selectedInterests: "selectedInterests",
  profileType: "profileType",
  contentFilters: "contentFilters",
};

export type MemoryState = {
  hasOnboarded: boolean;
  selectedInterests: string[];
  profileType: ProfileType | null;
  contentFilters: string[];
};

export function loadMemoryState(): MemoryState {
  return {
    hasOnboarded: loadFromStorage<boolean>(STORAGE_KEYS.hasOnboarded, false),
    selectedInterests: loadFromStorage<string[]>(STORAGE_KEYS.selectedInterests, []),
    profileType: loadFromStorage<ProfileType | null>(
      STORAGE_KEYS.profileType,
      null,
    ),
    contentFilters: loadFromStorage<string[]>(STORAGE_KEYS.contentFilters, []),
  };
}

export function persistOnboarding(
  interests: string[],
  profile: ProfileType,
): MemoryState {
  saveToStorage(STORAGE_KEYS.hasOnboarded, true);
  saveToStorage(STORAGE_KEYS.selectedInterests, interests);
  saveToStorage(STORAGE_KEYS.profileType, profile);
  saveToStorage(STORAGE_KEYS.contentFilters, interests);

  return {
    hasOnboarded: true,
    selectedInterests: interests,
    profileType: profile,
    contentFilters: interests,
  };
}

export function persistContentFilters(filters: string[]): string[] {
  saveToStorage(STORAGE_KEYS.contentFilters, filters);
  return filters;
}
