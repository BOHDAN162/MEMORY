import { getCurrentUserInterests } from "@/lib/server/interests";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

const ContentPage = async () => {
  const { data, error } = await getCurrentUserInterests();

  const interests = data ?? [];

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
    <section>
      <h1>Контент</h1>

      {error ? <p>Не удалось загрузить интересы: {error}</p> : null}

      {!error && interests.length === 0 ? <p>Интересы не выбраны</p> : null}

      {!error && interests.length > 0 ? (
        <div>
          {Object.entries(grouped).map(([cluster, items]) => (
            <div key={cluster}>
              <p>Cluster: {cluster}</p>
              <ul>
                {items.map((interest) => (
                  <li key={interest.id}>- {interest.title}</li>
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
