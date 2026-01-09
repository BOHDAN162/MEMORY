import type { Node, NodeProps } from "@xyflow/react";

import { cn } from "@/lib/utils/cn";

type ClusterNodeData = {
  kind: "cluster";
  clusterKey: string;
  title: string;
  count: number;
  radius?: number;
};

export const ClusterNode = ({ data }: NodeProps<Node<ClusterNodeData>>) => {
  return (
    <div
      className={cn(
        "pointer-events-none h-full w-full rounded-[28px] border border-white/8 bg-gradient-to-br",
        "from-white/6 via-white/2 to-transparent shadow-[0_30px_80px_-60px_rgba(15,23,42,0.8)]",
      )}
    >
      <div className="px-6 pt-5">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          {data.title}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
            {data.count}
          </span>
        </span>
      </div>
    </div>
  );
};

ClusterNode.displayName = "ClusterNode";
