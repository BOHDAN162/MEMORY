import { getCurrentUserInterests } from "@/lib/server/interests";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

type ContentPageProps = {
  searchParams?: {
    interests?: string | string[];
    mode?: string | string[];
  };
};

const ContentPage = async ({ searchParams }: ContentPageProps) => {
  const interestsParamRaw = searchParams?.interests;
  const interestsParamValue = Array.isArray(interestsParamRaw)
    ? interestsParamRaw[0]
    : interestsParamRaw ?? "";
  const modeParamRaw = searchParams?.mode;
  const modeParam = Array.isArray(modeParamRaw) ? modeParamRaw[0] : modeParamRaw;
  const interestsFromQuery = interestsParamValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const { data, error } = await getCurrentUserInterests();

  const interests = data ?? [];
  const allInterestIds = interests.map((interest) => interest.id);
  const hasExplicitInterests = interestsFromQuery.length > 0;
  const useAllInterests = !hasExplicitInterests && modeParam === "all";
  const effectiveInterestIds = hasExplicitInterests ? interestsFromQuery : allInterestIds;
  const selectionModeLabel = hasExplicitInterests
    ? "Выбрано на карте"
    : useAllInterests
      ? "Все интересы по запросу"
      : "Нет выделения, используем все ваши интересы";
  const selectionSourceNote = hasExplicitInterests
    ? "Параметр interests получен из карты интересов."
    : useAllInterests
      ? "Режим mode=all: используем весь список ваших интересов."
      : "Интересы не выбраны на карте — используем все интересы по умолчанию.";

  const grouped = interests.reduce<Record<string, typeof interests>>(
    (acc, interest) => {
      const key = interest.cluster?.trim() || "Без кластера";
      acc[key] = acc[key] ? [...acc[key], interest] : [interest];
      return acc;
    },
    {},
  );

  if (error === "Not authenticated") {
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

  return (
    <section className="space-y-4">
      <h1>Контент</h1>

      <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm shadow-black/5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Параметры запроса</p>
        <div className="mt-2 space-y-2">
          <p className="text-base font-semibold text-foreground">{selectionModeLabel}</p>
          <p className="text-sm text-muted-foreground">
            Подбор контента по интересам:{" "}
            {effectiveInterestIds.length > 0 ? effectiveInterestIds.join(", ") : "интересов нет"}
          </p>
          <p className="text-xs text-muted-foreground">{selectionSourceNote}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-1">
              mode: {modeParam ? String(modeParam) : "—"}
            </span>
            {interestsParamValue ? (
              <span className="rounded-full bg-muted px-2 py-1">
                interests: {interestsParamValue}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-destructive">Не удалось загрузить интересы: {error}</p>
      ) : null}

      {!error && interests.length === 0 ? (
        <p className="text-muted-foreground">Интересы не выбраны</p>
      ) : null}

      {!error && interests.length > 0 ? (
        <div className="space-y-3">
          {Object.entries(grouped).map(([cluster, items]) => (
            <div
              key={cluster}
              className="rounded-xl border border-border bg-background/70 p-3 shadow-inner shadow-black/5"
            >
              <p className="text-sm font-semibold text-foreground">Cluster: {cluster}</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {items.map((interest) => (
                  <li key={interest.id}>• {interest.title}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ContentPage;
