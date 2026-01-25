import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { cn } from "@/lib/utils/cn";
import type { TextNodeData } from "@/components/features/map/board/board-types";

export const TextNode = ({ data, selected }: NodeProps<Node<TextNodeData>>) => {
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
        "relative min-w-[140px] max-w-[320px] rounded-2xl border border-white/10 bg-background/70 px-4 py-3 text-left",
        "shadow-[0_20px_50px_-40px_rgba(0,0,0,0.6)] backdrop-blur",
        selected && "ring-2 ring-primary/60 shadow-[0_0_24px_rgba(99,102,241,0.35)]",
      )}
    >
      {data.isEditing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          rows={3}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full resize-none bg-transparent text-sm text-foreground outline-none"
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm font-medium text-foreground">
          {data.text?.trim() ? data.text : "Новый текст"}
        </p>
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

TextNode.displayName = "TextNode";
