import type { Node, NodeProps } from "@xyflow/react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type InterestNodeData = {
  title: string;
  cluster: string | null;
  isActive?: boolean;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  isDragging?: boolean;
};

export const InterestNode = ({ data, selected }: NodeProps<Node<InterestNodeData>>) => {
  const isHighlighted = data.isActive || data.isSelected;

  return (
    <div
      role="button"
      aria-pressed={selected}
      className={cn(
        "group relative flex h-[68px] w-[190px] items-center overflow-hidden rounded-[18px] border px-4 text-left",
        "border-white/10 bg-gradient-to-br from-white/12 via-white/5 to-white/0 shadow-[0_18px_50px_-32px_rgba(0,0,0,0.8)] backdrop-blur",
        "transition-all duration-200 hover:border-primary/60 hover:shadow-[0_18px_50px_-30px_rgba(79,70,229,0.6)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isHighlighted && "border-primary/60 shadow-[0_14px_45px_-24px_rgba(99,102,241,0.6)] ring-1 ring-primary/30",
        data.isSelected && "ring-2 ring-primary/60 shadow-[0_0_24px_rgba(99,102,241,0.35)]",
        data.isMultiSelected && "ring-2 ring-primary/80",
        data.isDragging && "scale-[1.02] shadow-xl shadow-primary/15",
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-90">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-primary/5" />
      </div>
      <div className="relative flex w-full items-center justify-between gap-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {data.title}
        </p>
        {data.isSelected ? (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/40">
            <Check className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>
    </div>
  );
};

InterestNode.displayName = "InterestNode";
