import type { Interest } from "@/lib/types/interests";

export const ONBOARDING_CLUSTER_ORDER = [
  "SELF",
  "BUSINESS",
  "TECH",
  "LEARNING",
  "HEALTH",
  "COMMUNICATION",
  "CREATIVITY",
  "FINANCE",
] as const;

export const ONBOARDING_ANCHOR_INTERESTS: Record<(typeof ONBOARDING_CLUSTER_ORDER)[number], string[]> = {
  SELF: ["self-growth", "mindfulness", "productivity"],
  BUSINESS: ["career", "leadership"],
  TECH: ["ai", "coding", "data-analytics"],
  LEARNING: ["languages", "learning-skills"],
  HEALTH: ["fitness", "mental-health"],
  COMMUNICATION: ["public-speaking", "networking"],
  CREATIVITY: ["design", "writing"],
  FINANCE: ["investing", "personal-finance"],
};

export const ONBOARDING_MIN_INTERESTS = 3;
export const ONBOARDING_MAX_INTERESTS = 18;

const anchorSlugs = new Set(
  Object.values(ONBOARDING_ANCHOR_INTERESTS)
    .flat()
    .map((slug) => slug.toLowerCase()),
);

const getClusterRank = (cluster?: string | null) => {
  if (!cluster) return Number.MAX_SAFE_INTEGER;
  const normalized = cluster.toUpperCase();
  const index = ONBOARDING_CLUSTER_ORDER.indexOf(normalized as (typeof ONBOARDING_CLUSTER_ORDER)[number]);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

export const selectAnchoredInterests = (interests: Interest[]): Interest[] => {
  const filtered = interests.filter((interest) => anchorSlugs.has(interest.slug.toLowerCase()));
  const source = filtered.length > 0 ? filtered : interests;

  return [...source]
    .sort((a, b) => {
      const clusterRankA = getClusterRank(a.cluster);
      const clusterRankB = getClusterRank(b.cluster);

      if (clusterRankA !== clusterRankB) {
        return clusterRankA - clusterRankB;
      }

      return a.title.localeCompare(b.title, "ru", { sensitivity: "base" });
    })
    .slice(0, ONBOARDING_MAX_INTERESTS);
};
