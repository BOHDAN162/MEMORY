import type { ContentItem } from "@/lib/server/content/types";

const stripEmojis = (value: string): string => value.replace(/\p{Extended_Pictographic}/gu, "");

const truncate = (value: string, maxLength = 120): string => {
  if (value.length <= maxLength) {
    return value;
  }

  const sliceLength = Math.max(0, maxLength - 1);
  return `${value.slice(0, sliceLength).trimEnd()}…`;
};

const sanitize = (value: string): string => {
  const cleaned = stripEmojis(value).replace(/\s+/g, " ").trim();
  return truncate(cleaned, 120);
};

const getInterestTitle = (item: ContentItem): string | null => {
  const interestTitles = Array.isArray(item.interestTitles) ? item.interestTitles : [];
  if (interestTitles.length > 0) {
    return interestTitles[0] ?? null;
  }

  const meta = item.meta as Record<string, unknown> | undefined;
  const metaTitle =
    typeof meta?.interestTitle === "string"
      ? meta.interestTitle
      : typeof meta?.interest_title === "string"
        ? meta.interest_title
        : null;

  if (metaTitle) {
    return metaTitle;
  }

  const [firstInterestId] = item.interestIds ?? [];
  return typeof firstInterestId === "string" && firstInterestId ? firstInterestId : null;
};

export const buildWhy = (item: ContentItem): string => {
  if (item.why && typeof item.why === "string" && item.why.trim()) {
    return sanitize(item.why);
  }

  if (Array.isArray(item.interestIds) && item.interestIds.length === 1) {
    const interestTitle = getInterestTitle(item);
    if (interestTitle) {
      return sanitize(`Рекомендовано по интересу «${interestTitle}»`);
    }
  }

  if (Array.isArray(item.interestIds) && item.interestIds.length > 1) {
    return sanitize("Рекомендовано по вашим интересам");
  }

  if (item.provider === "prompts") {
    return sanitize("Шаблон для работы с вашими интересами");
  }

  return sanitize("Рекомендация по вашим интересам");
};
