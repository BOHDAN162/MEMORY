import type { Node, NodeProps } from "@xyflow/react";
import { Handle, NodeResizer, Position } from "@xyflow/react";

import { cn } from "@/lib/utils/cn";
import type { FrameNodeData } from "@/components/features/map/board/board-types";

export const FrameNode = ({ data, selected }: NodeProps<Node<FrameNodeData>>) => {
  return (
    <div
      className={cn(
        "relative h-full w-full rounded-3xl border border-dashed border-white/20 bg-white/5",
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-foreground/70",
        selected && "ring-2 ring-primary/40",
      )}
    >
      <NodeResizer
        color="rgba(148,163,184,0.8)"
        isVisible={selected}
        minWidth={220}
        minHeight={160}
      />
      <span>{data.title || "Frame"}</span>

      <Handle type="source" position={Position.Top} className="h-2 w-2 border-0 bg-slate-300" />
      <Handle type="source" position={Position.Right} className="h-2 w-2 border-0 bg-slate-300" />
      <Handle type="source" position={Position.Bottom} className="h-2 w-2 border-0 bg-slate-300" />
      <Handle type="source" position={Position.Left} className="h-2 w-2 border-0 bg-slate-300" />
      <Handle type="target" position={Position.Top} className="h-2 w-2 border-0 bg-slate-300" />
      <Handle type="target" position={Position.Right} className="h-2 w-2 border-0 bg-slate-300" />
      <Handle type="target" position={Position.Bottom} className="h-2 w-2 border-0 bg-slate-300" />
      <Handle type="target" position={Position.Left} className="h-2 w-2 border-0 bg-slate-300" />
    </div>
  );
};

FrameNode.displayName = "FrameNode";
