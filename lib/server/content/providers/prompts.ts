import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROMPT_TEMPLATES } from "../catalog/prompts";
import type { PromptContext, PromptTemplate } from "../catalog/prompts";
import type { ContentItem, ContentProvider, ProviderFetchResult, ProviderRequest } from "../types";

type InterestRow = {
  id: string;
  title: string;
  cluster: string | null;
  slug: string | null;
};

const clampLimit = (limit?: number) => {
  const value = typeof limit === "number" ? limit : 12;
  return Math.max(5, Math.min(value, 20));
};

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const selectTemplates = (
  templates: PromptTemplate[],
  interestTitles: string[],
  interestClusters: string[],
): PromptTemplate[] => {
  const seen = new Set<string>();

  return templates.filter((template) => {
    const hasInterestTargeting = (template.interestTitles?.length ?? 0) > 0;
    const hasClusterTargeting = (template.clusters?.length ?? 0) > 0;
    const hasTargeting = hasInterestTargeting || hasClusterTargeting;

    const matchesInterest = (template.interestTitles ?? []).some((title) =>
      interestTitles.includes(normalize(title)),
    );
    const matchesCluster =
      interestClusters.length > 0 &&
      (template.clusters ?? []).some((cluster) => interestClusters.includes(normalize(cluster)));

    const shouldInclude = !hasTargeting || matchesInterest || matchesCluster;

    if (!shouldInclude) return false;
    if (seen.has(template.id)) return false;

    seen.add(template.id);
    return true;
  });
};

const promptsProvider: ContentProvider = {
  id: "prompts",
  ttlSeconds: 60 * 60 * 24 * 30,
  async fetch(req: ProviderRequest): Promise<ProviderFetchResult> {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return { items: [], error: "Supabase client is not configured" };
    }

    const interestIds = Array.from(new Set(req.interestIds.filter(Boolean)));

    if (interestIds.length === 0) {
      return { items: [], error: null };
    }

    const { data, error } = await supabase
      .from("interests")
      .select("id, title, cluster, slug")
      .in("id", interestIds);

    if (error || !data) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[prompts] failed to load interests", error?.message);
      }
      return { items: [], error: "Failed to load interests" };
    }

    const interests: InterestRow[] = data
      .map((row) => ({
        id: row.id,
        title: row.title,
        cluster: row.cluster ?? null,
        slug: row.slug ?? null,
      }))
      .filter((row) => Boolean(row.id) && Boolean(row.title));

    if (interests.length === 0) {
      return { items: [], error: "No interests available for prompts" };
    }

    const mode: "selected" | "all" = req.mode === "selected" ? "selected" : "all";

    const promptContext: PromptContext = {
      mode,
      interests: interests.map((interest) => ({
        id: interest.id,
        title: interest.title,
        cluster: interest.cluster,
      })),
      primaryInterest: interests[0]
        ? {
            id: interests[0].id,
            title: interests[0].title,
            cluster: interests[0].cluster,
          }
        : null,
    };

    const interestTitles = interests.map((interest) => normalize(interest.title)).filter(Boolean);
    const interestClusters = interests
      .map((interest) => normalize(interest.cluster))
      .filter(Boolean);

    const templates = selectTemplates(PROMPT_TEMPLATES, interestTitles, interestClusters);
    const limit = clampLimit(req.limit);
    const selectedTemplates = templates.slice(0, limit);

    const items: ContentItem[] = selectedTemplates.map((template) => {
      const promptText = template.build(promptContext);
      const matchesInterest = (template.interestTitles ?? []).some((title) =>
        interestTitles.includes(normalize(title)),
      );
      const matchesCluster = (template.clusters ?? []).some((cluster) =>
        interestClusters.includes(normalize(cluster)),
      );
      let score = 1;
      if (matchesCluster) score += 0.2;
      if (matchesInterest) score += 0.4;

      return {
        id: `template:${template.id}:${promptContext.primaryInterest?.id ?? "all"}`,
        provider: "prompts",
        type: "prompt",
        title: template.title,
        description: template.description,
        url: null,
        image: null,
        interestIds: interests.map((interest) => interest.id),
        why: promptContext.primaryInterest
          ? `Шаблон под интерес “${promptContext.primaryInterest.title}”`
          : "Шаблон под ваши интересы",
        score,
        meta: {
          promptText,
          tags: template.tags ?? [],
          mode,
          primaryInterestTitle: promptContext.primaryInterest?.title ?? null,
          interests: interests.map((interest) => interest.title),
        },
      };
    });

    return { items, error: null };
  },
};

export default promptsProvider;
