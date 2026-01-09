import type { Node, NodeProps } from "@xyflow/react";

import { cn } from "@/lib/utils/cn";

type ClusterNodeData = {
  label: string;
  width: number;
  height: number;
};

export const ClusterNode = ({ data }: NodeProps<Node<ClusterNodeData>>) => {
  return (
    <div
      className={cn(
        "pointer-events-none h-full w-full rounded-[28px] border border-white/8 bg-gradient-to-br",
        "from-white/6 via-white/2 to-transparent shadow-[0_30px_80px_-60px_rgba(15,23,42,0.8)]",
      )}
      style={{ width: data.width, height: data.height }}
    >
      <div className="px-6 pt-5">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          {data.label}
        </span>
      </div>
    </div>
  );
};

ClusterNode.displayName = "ClusterNode";
