import { cn } from "@/lib/utils";
import type { Interest } from "@/lib/interests";

export function InterestChip({
  interest,
  active,
  onToggle,
}: {
  interest: Interest;
  active: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(interest.key)}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "border-accent bg-accent/10 text-foreground shadow-[0_10px_30px_rgba(124,91,255,0.25)]"
          : "border-border/70 text-foreground/80 hover:border-border hover:bg-surface-strong",
      )}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_0_4px_rgba(124,91,255,0.15)]" />
      {interest.label}
    </button>
  );
}
