import { redirect } from "next/navigation";

import { getCurrentUserInterests } from "@/lib/server/interests";

const ContentPage = async () => {
  const result = await getCurrentUserInterests();

  if (result.error === "UNAUTHENTICATED") {
    redirect("/auth");
  }

  const interests = result.data ?? [];
  const grouped = interests.reduce<Record<string, typeof interests>>((acc, interest) => {
    const key = interest.cluster ?? "Без кластера";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(interest);
    return acc;
  }, {});

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">
            Interests
          </p>
          <h2 className="text-2xl font-semibold">Список интересов</h2>
          <p className="text-sm text-muted-foreground">
            Интересы загружаются из Supabase для текущего пользователя.
          </p>
        </div>
      </header>

      {result.error ? (
        <p className="text-sm text-destructive">
          Не удалось загрузить интересы: {result.error}
        </p>
      ) : null}

      {!result.error && interests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Интересы не выбраны</p>
      ) : null}

      {!result.error && interests.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(grouped).map(([cluster, items]) => (
            <article
              key={cluster}
              className="rounded-xl border border-border bg-background/40 p-4 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.45)]"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {cluster}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {items.map((interest) => (
                  <li key={interest.id}>{interest.title}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ContentPage;
