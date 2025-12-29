"use client";

import { Button } from "@/components/ui/button";
import { getProgressWithinLevel } from "@/lib/gamification/levels";
import type { GamificationState } from "@/lib/gamification/types";

type ProgressCardProps = {
  state: GamificationState;
  onAddXp: (delta: number) => void;
  onReset: () => void;
};

export const ProgressCard = ({ state, onAddXp, onReset }: ProgressCardProps) => {
  const progress = getProgressWithinLevel(state.xp);
  const xpToNext = Math.max(0, progress.nextLevelXp - progress.currentLevelXp);

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors duration-300">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Прогресс</p>
          <h2 className="text-2xl font-semibold">Ваш уровень</h2>
          <p className="text-sm text-muted-foreground">
            XP сохраняется локально. Кнопки ниже предназначены только для проверки
            каркаса.
          </p>
        </header>

        <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Level</span>
            <span className="text-base font-semibold text-foreground">{progress.level}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Текущий XP</span>
            <span className="text-base font-semibold text-foreground">{state.xp} XP</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>До следующего уровня</span>
            <span className="text-base font-semibold text-foreground">{xpToNext} XP</span>
          </div>

          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-secondary/60">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, progress.progress01 * 100)}%` }}
              />
            </div>
            <p className="text-right text-xs text-muted-foreground">
              {progress.currentLevelXp} / {progress.nextLevelXp} XP
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Dev tools
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="soft" onClick={() => onAddXp(25)}>
              +25 XP
            </Button>
            <Button size="sm" variant="soft" onClick={() => onAddXp(100)}>
              +100 XP
            </Button>
            <Button size="sm" variant="ghost" onClick={onReset}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
