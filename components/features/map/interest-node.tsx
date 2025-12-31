import type { Node, NodeProps } from "@xyflow/react";
import { Check, GripVertical } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { clusterKey } from "@/lib/map/auto-layout";

type InterestNodeData = {
  title: string;
  cluster: string | null;
  clusterLabel?: string;
  isActive?: boolean;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  isDragging?: boolean;
};

export const InterestNode = ({ data, selected }: NodeProps<Node<InterestNodeData>>) => {
  const clusterLabel = data.clusterLabel ?? clusterKey(data.cluster);
  const isHighlighted = data.isActive || data.isSelected;

  return (
    <div
      role="button"
      aria-pressed={selected}
      className={cn(
        "group relative min-w-[180px] max-w-[260px] rounded-2xl border px-4 py-3 text-left shadow-lg backdrop-blur transition-all duration-200",
        "border-border/70 bg-card/80 shadow-black/15",
        "hover:border-primary/50 hover:shadow-primary/10 hover:shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isHighlighted && "border-primary/70 bg-card/90 ring-1 ring-primary/30",
        data.isSelected && "ring-2 ring-primary/60",
        data.isMultiSelected && "ring-2 ring-primary/80",
        data.isDragging && "scale-[1.02] shadow-xl shadow-primary/10",
      )}
    >
      <div className="absolute right-3 top-3 flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-muted/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GripVertical className="h-3 w-3" aria-hidden />
          </span>
          {clusterLabel}
        </span>
        {data.isMultiSelected ? (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/40">
            <Check className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 pr-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Mind Map
        </p>
        <p className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
          {data.title}
        </p>
        <p className="text-xs text-muted-foreground">
          Перетяни, чтобы поменять позицию. Кликни, чтобы выбрать.
        </p>
      </div>
    </div>
  );
};

InterestNode.displayName = "InterestNode";
