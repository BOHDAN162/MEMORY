import type { Node, NodeProps } from "@xyflow/react";
import { Handle, NodeResizer, Position } from "@xyflow/react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { cn } from "@/lib/utils/cn";
import type { StickyNodeData } from "@/components/features/map/board-node-types";

export const StickyNode = ({ data, selected }: NodeProps<Node<StickyNodeData>>) => {
  const [draft, setDraft] = useState(data.text ?? "");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!data.isEditing) return;
    setDraft(data.text ?? "");
    const handle = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    });
    return () => window.cancelAnimationFrame(handle);
  }, [data.isEditing, data.text]);

  const commit = () => {
    data.onCommit?.(draft.trim());
  };

  const cancel = () => {
    setDraft(data.text ?? "");
    data.onCancel?.();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  return (
    <div
      className={cn(
        "relative h-full w-full rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-200/20 via-amber-100/10 to-transparent",
        "px-4 py-3 text-left shadow-[0_24px_60px_-40px_rgba(0,0,0,0.6)] backdrop-blur",
        selected && "ring-2 ring-amber-300/60",
      )}
    >
      <NodeResizer
        color="rgba(251,191,36,0.8)"
        isVisible={selected}
        minWidth={160}
        minHeight={120}
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
        {data.title || "Sticky"}
      </p>
      {data.isEditing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          rows={4}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          className="mt-2 w-full resize-none bg-transparent text-sm text-foreground outline-none"
        />
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
          {data.text?.trim() ? data.text : "Добавьте заметку"}
        </p>
      )}

      <Handle type="source" position={Position.Top} className="h-2 w-2 border-0 bg-amber-300" />
      <Handle type="source" position={Position.Right} className="h-2 w-2 border-0 bg-amber-300" />
      <Handle type="source" position={Position.Bottom} className="h-2 w-2 border-0 bg-amber-300" />
      <Handle type="source" position={Position.Left} className="h-2 w-2 border-0 bg-amber-300" />
      <Handle type="target" position={Position.Top} className="h-2 w-2 border-0 bg-amber-300" />
      <Handle type="target" position={Position.Right} className="h-2 w-2 border-0 bg-amber-300" />
      <Handle type="target" position={Position.Bottom} className="h-2 w-2 border-0 bg-amber-300" />
      <Handle type="target" position={Position.Left} className="h-2 w-2 border-0 bg-amber-300" />
    </div>
  );
};

StickyNode.displayName = "StickyNode";
