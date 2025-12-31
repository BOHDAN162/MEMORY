import Link from "next/link";
import { getContent } from "@/lib/server/content/service";
import type { ContentProviderId } from "@/lib/server/content/types";
import { getUserInterests } from "@/lib/server/interests";
import { buttonVariants } from "@/components/ui/button";

type ContentPageProps = {
  searchParams?: {
    ids?: string | string[];
    interests?: string | string[];
    mode?: string | string[];
    debug?: string | string[];
  };
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
  const modeParamRaw = searchParams?.mode;
  const modeParam = Array.isArray(modeParamRaw) ? modeParamRaw[0] : modeParamRaw;
  const selectionMode = modeParam === "selected" ? "selected" : "all";
  const idsParam = parseIds(searchParams?.ids);
  const interestsParam = parseIds(searchParams?.interests);
  const idsFromQuery = idsParam.length > 0 ? idsParam : interestsParam;
  const debugParamRaw = searchParams?.debug;
  const debugParam = Array.isArray(debugParamRaw) ? debugParamRaw[0] : debugParamRaw;

  const providerIds: ContentProviderId[] = ["youtube", "books", "articles", "telegram"];
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
      })
    : null;

  const cards = contentResult?.items ?? [];
  const debugEnabled = process.env.NODE_ENV !== "production" || debugParam === "1";
  const debug = debugEnabled ? contentResult?.debug : null;
  const selectionDescription =
    selectionMode === "selected"
      ? "Режим: только выбранные интересы из параметра ids."
      : "Режим: все интересы пользователя.";

  return (
    <section className="space-y-4">
      <h1>Контент</h1>

      <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm shadow-black/5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Параметры запроса</p>
        <div className="mt-2 space-y-2">
          <p className="text-base font-semibold text-foreground">{selectionDescription}</p>
          <p className="text-sm text-muted-foreground">
            Интересы: {interestIds.length > 0 ? interestIds.join(", ") : "не заданы"}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-1">mode: {selectionMode}</span>
            {idsFromQuery.length > 0 ? (
              <span className="rounded-full bg-muted px-2 py-1">
                ids: {idsFromQuery.join(", ")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {interestsError ? (
        <p className="text-destructive">Не удалось загрузить интересы: {interestsError}</p>
      ) : null}

      {!interestsError && interestIds.length === 0 ? (
        <p className="text-muted-foreground">
          Нет интересов для запроса. Добавьте интересы или передайте ids через строку запроса.
        </p>
      ) : null}

      {cards.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((item) => (
            <li
              key={`${item.provider}:${item.id}`}
              className="flex flex-col gap-2 rounded-xl border border-border bg-background/80 p-4 shadow-inner shadow-black/5"
            >
              <div className="flex items-center justify-between gap-2 text-xs uppercase text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold tracking-wide text-primary">
                  {item.provider}
                </span>
                <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium">
                  {item.type}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                {item.description ? (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                ) : null}
                {item.why ? <p className="text-xs text-foreground/80">Почему: {item.why}</p> : null}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-1">
                    Интересы: {item.interestIds.join(", ") || "—"}
                  </span>
                  {item.score !== null && item.score !== undefined ? (
                    <span className="rounded-full bg-muted px-2 py-1">Score: {item.score}</span>
                  ) : null}
                  {item.cachedAt ? (
                    <span className="rounded-full bg-muted px-2 py-1">
                      Cached: {new Date(item.cachedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                {item.url ? (
                  <a
                    className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                    href={item.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Открыть
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Контента пока нет — провайдеры вернули пустой список.</p>
      )}

      {debug ? (
        <details className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Debug
          </summary>
          <pre className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  );
};

export default ContentPage;
