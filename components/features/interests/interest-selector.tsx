"use client";

import { useMemo, useState, useTransition } from "react";
import { saveUserInterests } from "@/app/actions/save-user-interests";
import { Button } from "@/components/ui/button";
import type { Interest } from "@/lib/types/interests";

type InterestSelectorProps = {
  interests: Interest[];
  initialSelected: string[];
};

type StatusMessage = {
  type: "success" | "error";
  message: string;
};

export const InterestSelector = ({
  interests,
  initialSelected,
}: InterestSelectorProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelected),
  );
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isPending, startTransition] = useTransition();

  const orderedInterests = useMemo(
    () =>
      [...interests].sort((a, b) => a.title.localeCompare(b.title, "ru", { sensitivity: "base" })),
    [interests],
  );

  const toggleInterest = (interestId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(interestId)) {
        next.delete(interestId);
      } else {
        next.add(interestId);
      }
      return next;
    });
  };

  const handleSubmit = async (formData: FormData) => {
    setStatus(null);

    startTransition(async () => {
      try {
        const result = await saveUserInterests(formData);

        setStatus(
          result.error
            ? { type: "error", message: result.error }
            : { type: "success", message: result.message ?? "Сохранено" },
        );
      } catch (error) {
        console.error("Failed to save interests", error);
        setStatus({
          type: "error",
          message: "Не удалось сохранить интересы. Попробуйте ещё раз.",
        });
      }
    });
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {orderedInterests.map((interest) => {
          const isSelected = selectedIds.has(interest.id);

          return (
            <label
              key={interest.id}
              className={`group relative flex cursor-pointer flex-col gap-1 rounded-xl border border-border bg-background/60 p-4 shadow-[0_12px_40px_-30px_rgba(0,0,0,0.45)] transition hover:border-primary/60 ${
                isSelected ? "ring-2 ring-primary/80" : ""
              }`}
            >
              <input
                type="checkbox"
                name="interestIds"
                value={interest.id}
                checked={isSelected}
                onChange={() => toggleInterest(interest.id)}
                className="sr-only"
              />
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {interest.cluster ?? "Без кластера"}
              </p>
              <span className="text-lg font-semibold">{interest.title}</span>
              <span className="text-xs text-muted-foreground">Slug: {interest.slug}</span>
              <span
                className={`absolute right-3 top-3 inline-flex h-6 min-w-6 items-center justify-center rounded-full border text-xs font-semibold transition ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card/70 text-muted-foreground"
                }`}
                aria-hidden
              >
                {isSelected ? "✓" : ""}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {status ? (
            <span className={status.type === "success" ? "text-green-600" : "text-destructive"}>
              {status.message}
            </span>
          ) : (
            <span>Выберите один или несколько интересов и сохраните.</span>
          )}
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Сохраняем..." : "Сохранить выбранные интересы"}
        </Button>
      </div>
    </form>
  );
};
