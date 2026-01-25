import type { Node, NodeProps } from "@xyflow/react";
import { Handle, NodeResizer, Position } from "@xyflow/react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { cn } from "@/lib/utils/cn";
import type { ImageNodeData } from "@/components/features/map/board/board-types";

export const ImageNode = ({ data, selected }: NodeProps<Node<ImageNodeData>>) => {
  const [draft, setDraft] = useState(data.url ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!data.isEditing) return;
    setDraft(data.url ?? "");
    const handle = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(handle);
  }, [data.isEditing, data.url]);

  const commit = () => {
    data.onCommit?.(draft.trim());
  };

  const cancel = () => {
    setDraft(data.url ?? "");
    data.onCancel?.();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  const hasImage = Boolean(data.url?.trim());

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-muted/30",
        "shadow-[0_24px_60px_-40px_rgba(0,0,0,0.6)]",
        selected && "ring-2 ring-primary/60",
      )}
    >
      <NodeResizer
        color="rgba(99,102,241,0.8)"
        isVisible={selected}
        minWidth={180}
        minHeight={120}
      />
      {data.isEditing ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 px-4">
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://..."
            className="w-full rounded-lg border border-white/10 bg-background/70 px-3 py-2 text-xs text-foreground outline-none"
          />
        </div>
      ) : null}
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.url}
          alt={data.caption ?? "Image"}
          className={cn("h-full w-full object-cover", data.isEditing && "opacity-25")}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center text-xs text-muted-foreground",
            data.isEditing && "opacity-0",
          )}
        >
          Двойной клик — вставить URL
        </div>
      )}

      <Handle type="source" position={Position.Top} className="h-2 w-2 border-0 bg-primary/80" />
      <Handle type="source" position={Position.Right} className="h-2 w-2 border-0 bg-primary/80" />
      <Handle type="source" position={Position.Bottom} className="h-2 w-2 border-0 bg-primary/80" />
      <Handle type="source" position={Position.Left} className="h-2 w-2 border-0 bg-primary/80" />
      <Handle type="target" position={Position.Top} className="h-2 w-2 border-0 bg-primary/80" />
      <Handle type="target" position={Position.Right} className="h-2 w-2 border-0 bg-primary/80" />
      <Handle type="target" position={Position.Bottom} className="h-2 w-2 border-0 bg-primary/80" />
      <Handle type="target" position={Position.Left} className="h-2 w-2 border-0 bg-primary/80" />
    </div>
  );
};

ImageNode.displayName = "ImageNode";
