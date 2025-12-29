import type { Badge } from "@/lib/gamification/types";

type BadgesGridProps = {
  badges: Badge[];
};

export const BadgesGrid = ({ badges }: BadgesGridProps) => {
  return (
    <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Бейджи</p>
          <h2 className="text-2xl font-semibold">Достижения</h2>
          <p className="text-sm text-muted-foreground">
            Заглушки v0: часть бейджей разблокирована, остальные ждут событий.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => (
            <article
              key={badge.id}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-4"
              data-locked={!badge.isUnlocked}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background text-lg"
                aria-hidden
              >
                {badge.icon}
              </div>
              <div
                className={`flex flex-col gap-1 ${
                  badge.isUnlocked ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold leading-none">
                    {badge.title}
                  </h3>
                  {!badge.isUnlocked ? (
                    <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Locked
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
                {badge.unlockRule ? (
                  <p className="text-xs text-muted-foreground/90">{badge.unlockRule}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
