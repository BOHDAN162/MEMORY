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
  isConnectSource?: boolean;
  isConnectTarget?: boolean;
  isPreviewTarget?: boolean;
};

export const InterestNode = ({ data, selected }: NodeProps<Node<InterestNodeData>>) => {
  const clusterLabel = data.clusterLabel ?? clusterKey(data.cluster);
  const isHighlighted = data.isActive || data.isSelected || data.isConnectSource;
  const isLinked = data.isConnectTarget || data.isPreviewTarget;

  return (
    <div
      role="button"
      aria-pressed={selected}
      className={cn(
        "group relative min-w-[200px] max-w-[280px] overflow-hidden rounded-2xl border px-4 py-3 text-left shadow-[0_16px_50px_-30px_rgba(0,0,0,0.85)] backdrop-blur transition-all duration-200",
        "border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0",
        "hover:border-primary/60 hover:shadow-primary/10 hover:shadow-[0_20px_55px_-30px_rgba(79,70,229,0.65)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isHighlighted && "border-primary/60 shadow-[0_12px_45px_-24px_rgba(99,102,241,0.6)] ring-1 ring-primary/30",
        data.isSelected && "ring-2 ring-primary/60",
        data.isMultiSelected && "ring-2 ring-primary/80",
        data.isDragging && "scale-[1.02] shadow-xl shadow-primary/15",
        isLinked && "shadow-[0_0_0_2px_rgba(99,102,241,0.55)]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-80">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
      </div>
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
              <GripVertical className="h-3.5 w-3.5" aria-hidden />
            </span>
            {clusterLabel}
          </span>
          {data.isMultiSelected ? (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/40">
              <Check className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
        </div>
        <p className="line-clamp-3 text-base font-semibold leading-snug text-foreground">
          {data.title}
        </p>
      </div>
    </div>
  );
};

InterestNode.displayName = "InterestNode";
