import Link from "next/link";
import ContentHub, { type ContentDebugInfo, type NormalizedContentItem } from "@/components/content/content-hub";
import ContentDebugPanel from "@/components/content/content-debug-panel";
import { buttonVariants } from "@/components/ui/button";
import { buildWhy } from "@/lib/content/why";
import { getContent } from "@/lib/server/content/service";
import type { ContentItem, ContentProviderId, ContentType } from "@/lib/server/content/types";
import { getUserInterests } from "@/lib/server/interests";

type ContentPageSearchParams = {
  ids?: string | string[];
  interests?: string | string[];
  mode?: string | string[];
  debug?: string | string[];
};

type ContentPageProps = {
  searchParams?: ContentPageSearchParams | Promise<ContentPageSearchParams>;
};

const parseIds = (param?: string | string[]): string[] => {
  if (!param) return [];
  const value = Array.isArray(param) ? param[0] : param;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const ContentPage = async ({ searchParams }: ContentPageProps) => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const modeParamRaw = resolvedSearchParams?.mode;
  const modeParam = Array.isArray(modeParamRaw) ? modeParamRaw[0] : modeParamRaw;
  const selectionMode = modeParam === "selected" ? "selected" : "all";
  const idsParam = parseIds(resolvedSearchParams?.ids);
  const interestsParam = parseIds(resolvedSearchParams?.interests);
  const idsFromQuery = idsParam.length > 0 ? idsParam : interestsParam;
  const debugParamRaw = resolvedSearchParams?.debug;
  const debugParam = Array.isArray(debugParamRaw) ? debugParamRaw[0] : debugParamRaw;
  const debugMode = debugParam === "1";

  const providerIds: ContentProviderId[] = ["youtube", "books", "articles", "telegram", "prompts"];
  let interestIds: string[] = [];
  let interestsError: string | null = null;

  if (selectionMode === "selected") {
    interestIds = idsFromQuery;
  } else {
    const { data, error } = await getUserInterests();
    interestIds = data ?? [];
    interestsError = error;
  }

  if (selectionMode === "all" && interestsError === "Not authenticated") {
    return (
      <section className="space-y-4">
        <h1>Контент</h1>
        <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-muted-foreground shadow-inner shadow-black/5">
          <p className="text-sm text-foreground">Вы не вошли. Перейдите на /auth.</p>
          <Link className={buttonVariants({ variant: "primary", size: "sm" })} href="/auth">
            Войти
          </Link>
        </div>
      </section>
    );
  }

  const shouldFetchContent = interestIds.length > 0 && !interestsError;
  const contentResult = shouldFetchContent
    ? await getContent({
        providerIds,
        interestIds,
        limit: 20,
        mode: selectionMode,
      })
    : null;
  const items = contentResult?.items ?? [];
  const debug: ContentDebugInfo | null = contentResult?.debug ?? null;

  const providerLabels: Record<ContentProviderId, string> = {
    youtube: "YouTube",
    books: "Books",
    articles: "Articles",
    telegram: "Telegram",
    prompts: "Prompts",
  };

  const typeLabels: Record<ContentType, string> = {
    video: "Видео",
    book: "Книга",
    article: "Статья",
    channel: "Канал",
    prompt: "Промпт",
  };

  const getString = (value: unknown): string | null => {
    if (typeof value === "string" && value.trim()) return value.trim();
    return null;
  };

  const getNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return null;
  };

  const getPromptMeta = (item: ContentItem) => {
    const meta = item.meta as Record<string, unknown> | undefined;
    const promptText = getString(meta?.promptText) ?? getString(meta?.prompt_text) ?? null;
    const tagsRaw = Array.isArray(meta?.tags) ? (meta?.tags as unknown[]) : [];
    const promptTags = tagsRaw
      .filter((tag): tag is string => typeof tag === "string" && Boolean(tag))
      .slice(0, 6);
    return { promptText, promptTags };
  };

  const extractDate = (meta: Record<string, unknown> | undefined) => {
    const publishedAt = getString(meta?.publishedAt) ?? getString(meta?.published_at) ?? null;
    const createdAt = getString(meta?.createdAt) ?? getString(meta?.created_at) ?? null;
    const publishedYear = getNumber(meta?.publishedYear) ?? getNumber(meta?.published_year) ?? null;
    const sortableDate =
      publishedAt && !Number.isNaN(new Date(publishedAt).getTime())
        ? new Date(publishedAt).getTime()
        : createdAt && !Number.isNaN(new Date(createdAt).getTime())
          ? new Date(createdAt).getTime()
          : publishedYear
            ? new Date(publishedYear, 0, 1).getTime()
            : null;
    const dateLabel = publishedAt
      ? new Date(publishedAt).toLocaleDateString("ru-RU", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : createdAt
        ? new Date(createdAt).toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : publishedYear
          ? `Год: ${publishedYear}`
          : null;

    return { publishedAt, createdAt, publishedYear, sortableDate, dateLabel };
  };

  const normalizedItems: NormalizedContentItem[] = items.map((item) => {
    const meta = item.meta as Record<string, unknown> | undefined;
    const { promptText, promptTags } = item.type === "prompt" ? getPromptMeta(item) : { promptText: null, promptTags: [] };
    const { publishedAt, createdAt, publishedYear, sortableDate, dateLabel } = extractDate(meta);
    const providerLabel = providerLabels[item.provider] ?? item.provider.toUpperCase();
    const typeLabel = typeLabels[item.type] ?? item.type.toUpperCase();
    const whyText = buildWhy(item);

    return {
      ...item,
      providerLabel,
      typeLabel,
      whyText,
      promptText,
      promptTags,
      publishedAt,
      createdAt,
      publishedYear,
      sortableDate,
      dateLabel: dateLabel ?? null,
    };
  });

  return (
    <section className="relative space-y-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">Контент-хаб</p>
        <h1 className="text-3xl font-bold text-foreground">Подборка контента</h1>
        <p className="text-sm text-muted-foreground">
          Управляйте источниками, типами и сортировкой, чтобы быстро найти нужное.
        </p>
      </div>

      <ContentHub
        items={normalizedItems}
        selectionMode={selectionMode}
        interestIds={interestIds}
        debug={debug}
        debugEnabled={debugMode}
        interestsError={interestsError}
        availableProviders={providerIds}
      />

      {debugMode ? (
        <ContentDebugPanel
          debug={debug}
          selectionMode={selectionMode}
          interestIds={interestIds}
          availableProviders={providerIds}
          className="mt-6"
        />
      ) : null}
    </section>
  );
};

export default ContentPage;
