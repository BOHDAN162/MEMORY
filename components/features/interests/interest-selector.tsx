"use client";

import { useMemo, useState, useTransition } from "react";
import { saveUserInterests } from "@/app/actions/save-user-interests";
import { Button } from "@/components/ui/button";
import type { Interest } from "@/lib/types/interests";
import { useRouter } from "next/navigation";

type InterestSelectorProps = {
  interests: Interest[];
  initialSelected: string[];
  minimumSelected?: number;
  onSuccessRedirect?: string;
  selectionHint?: string;
  submitLabel?: string;
  groupByCluster?: boolean;
  clusterOrder?: readonly string[];
};

type StatusMessage = {
  type: "success" | "error";
  message: string;
};

export const InterestSelector = ({
  interests,
  initialSelected,
  minimumSelected = 0,
  onSuccessRedirect,
  selectionHint,
  submitLabel = "Сохранить выбранные интересы",
  groupByCluster = false,
  clusterOrder = [],
}: InterestSelectorProps) => {
  const router = useRouter();
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

  const groupedInterests = useMemo(() => {
    if (!groupByCluster) return [];

    const groups = orderedInterests.reduce<Record<string, Interest[]>>((acc, interest) => {
      const key = interest.cluster?.trim() || "Другое";
      acc[key] = acc[key] ? [...acc[key], interest] : [interest];
      return acc;
    }, {});

    const getClusterIndex = (cluster: string) => {
      const index = clusterOrder.indexOf(cluster);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };

    return Object.entries(groups).sort(([clusterA], [clusterB]) => {
      const orderA = getClusterIndex(clusterA);
      const orderB = getClusterIndex(clusterB);
      if (orderA !== orderB) return orderA - orderB;
      return clusterA.localeCompare(clusterB, "ru", { sensitivity: "base" });
    });
  }, [groupByCluster, orderedInterests, clusterOrder]);

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

    if (minimumSelected > 0 && selectedIds.size < minimumSelected) {
      setStatus({
        type: "error",
        message:
          selectionHint ?? `Выберите минимум ${minimumSelected} интереса, чтобы продолжить`,
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveUserInterests(formData);

        setStatus(
          result.error
            ? { type: "error", message: result.error }
            : { type: "success", message: result.message ?? "Сохранено" },
        );

        if (!result.error && onSuccessRedirect) {
          router.push(onSuccessRedirect);
        }
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
      {groupByCluster ? (
        <div className="space-y-6">
          {groupedInterests.map(([cluster, items]) => (
            <div key={cluster} className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{cluster}</p>
                <p className="text-xs text-muted-foreground">{items.length} вариантов</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((interest) => {
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
            </div>
          ))}
        </div>
      ) : (
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
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {status ? (
            <span className={status.type === "success" ? "text-green-600" : "text-destructive"}>
              {status.message}
            </span>
          ) : (
            <span>{selectionHint ?? "Выберите один или несколько интересов и сохраните."}</span>
          )}
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Сохраняем..." : submitLabel}
        </Button>
      </div>
    </form>
  );
};
