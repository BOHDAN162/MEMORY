import type { Node, NodeProps } from "@xyflow/react";
import { Handle, NodeResizer, Position } from "@xyflow/react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { cn } from "@/lib/utils/cn";
import type { CardNodeData } from "@/components/features/map/board/board-types";

export const CardNode = ({ data, selected }: NodeProps<Node<CardNodeData>>) => {
  const [draft, setDraft] = useState({ title: data.title ?? "", text: data.text ?? "" });
  const titleRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!data.isEditing) return;
    setDraft({ title: data.title ?? "", text: data.text ?? "" });
    const handle = window.requestAnimationFrame(() => {
      titleRef.current?.focus();
      titleRef.current?.select();
    });
    return () => window.cancelAnimationFrame(handle);
  }, [data.isEditing, data.title, data.text]);

  const commit = () => {
    data.onCommit?.({ title: draft.title.trim(), text: draft.text.trim() });
  };

  const cancel = () => {
    setDraft({ title: data.title ?? "", text: data.text ?? "" });
    data.onCancel?.();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  const handleTextareaKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commit();
    }
    handleKeyDown(event);
  };

  return (
    <div
      className={cn(
        "relative h-full w-full rounded-2xl border border-slate-200/10 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-950/50",
        "px-4 py-3 text-left shadow-[0_24px_60px_-40px_rgba(0,0,0,0.6)] backdrop-blur",
        selected && "ring-2 ring-indigo-400/70",
      )}
    >
      <NodeResizer color="rgba(129,140,248,0.9)" isVisible={selected} minWidth={200} minHeight={140} />
      {data.isEditing ? (
        <input
          ref={titleRef}
          value={draft.title}
          onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="Card title"
          className="w-full bg-transparent text-sm font-semibold text-foreground outline-none"
        />
      ) : (
        <p className="text-sm font-semibold text-foreground">{data.title?.trim() || "Card title"}</p>
      )}
      {data.isEditing ? (
        <textarea
          ref={textRef}
          value={draft.text}
          rows={4}
          onChange={(event) => setDraft((prev) => ({ ...prev, text: event.target.value }))}
          onKeyDown={handleTextareaKeyDown}
          className="mt-2 w-full resize-none bg-transparent text-sm text-muted-foreground outline-none"
        />
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {data.text?.trim() ? data.text : "Описание"}
        </p>
      )}

      <Handle type="source" position={Position.Top} className="h-2 w-2 border-0 bg-indigo-400" />
      <Handle type="source" position={Position.Right} className="h-2 w-2 border-0 bg-indigo-400" />
      <Handle type="source" position={Position.Bottom} className="h-2 w-2 border-0 bg-indigo-400" />
      <Handle type="source" position={Position.Left} className="h-2 w-2 border-0 bg-indigo-400" />
      <Handle type="target" position={Position.Top} className="h-2 w-2 border-0 bg-indigo-400" />
      <Handle type="target" position={Position.Right} className="h-2 w-2 border-0 bg-indigo-400" />
      <Handle type="target" position={Position.Bottom} className="h-2 w-2 border-0 bg-indigo-400" />
      <Handle type="target" position={Position.Left} className="h-2 w-2 border-0 bg-indigo-400" />
    </div>
  );
};

CardNode.displayName = "CardNode";
