import { getInterests } from "@/lib/server/interests";

const ContentPage = async () => {
  const { data: interests, error } = await getInterests();

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary">
            Interests
          </p>
          <h2 className="text-2xl font-semibold">Список интересов</h2>
          <p className="text-sm text-muted-foreground">
            Эти данные загружаются напрямую из Supabase.
          </p>
        </div>
      </header>

      {error ? (
        <p className="text-sm text-destructive">
          Не удалось загрузить интересы: {error}
        </p>
      ) : null}

      {!error ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {interests?.map((interest) => (
            <article
              key={interest.id}
              className="rounded-xl border border-border bg-background/40 p-4 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.45)]"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {interest.cluster ?? "Без кластера"}
              </p>
              <h3 className="text-lg font-semibold">{interest.title}</h3>
              <p className="text-xs text-muted-foreground">Slug: {interest.slug}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ContentPage;
