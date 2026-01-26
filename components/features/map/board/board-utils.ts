import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";

import type { BoardEdgeRecord, BoardNodeRecord } from "@/lib/types";
import type { BoardNodeData, BoardNodeKind, BoardTool } from "@/components/features/map/board/board-types";

const DEFAULT_NODE_SIZES: Record<Exclude<BoardNodeKind, "interest">, { width: number; height: number }> = {
  text: { width: 220, height: 120 },
  sticky: { width: 240, height: 180 },
  card: { width: 260, height: 200 },
  image: { width: 260, height: 180 },
  frame: { width: 320, height: 240 },
};

export const defaultNodeSize = (kind: BoardTool | BoardNodeKind) => {
  if (kind === "hand" || kind === "select" || kind === "connect" || kind === "interest") {
    return DEFAULT_NODE_SIZES.text;
  }
  return DEFAULT_NODE_SIZES[kind];
};

export const createDefaultNodeData = (tool: BoardTool | BoardNodeKind): BoardNodeData => {
  switch (tool) {
    case "text":
      return { kind: "text", text: "" };
    case "sticky":
      return { kind: "sticky", title: "Sticky", text: "" };
    case "card":
      return { kind: "card", title: "Card", text: "" };
    case "image":
      return { kind: "image", url: "" };
    case "frame":
      return { kind: "frame", title: "Frame" };
    case "interest":
      return { kind: "interest", title: "", cluster: null, clusterLabel: "" };
    default:
      return { kind: "text", text: "" };
  }
};

export const isBoardNodeType = (type: string): type is Exclude<BoardNodeKind, "interest"> =>
  type === "text" || type === "sticky" || type === "card" || type === "image" || type === "frame";

const stripNodeData = (data: BoardNodeData): Record<string, unknown> => {
  const { onCommit, onCancel, isEditing, ...rest } = data as BoardNodeData & {
    onCommit?: unknown;
    onCancel?: unknown;
    isEditing?: unknown;
  };
  return rest as Record<string, unknown>;
};

export const toFlowNode = (record: BoardNodeRecord): Node<BoardNodeData> => {
  const size = defaultNodeSize(record.type);
  const width = record.width ?? size.width;
  const height = record.height ?? size.height;
  const zIndex = record.zIndex ?? (record.type === "frame" ? 0 : 2);

  const data = record.data ? (record.data as BoardNodeData) : createDefaultNodeData(record.type);

  return {
    id: record.id,
    type: record.type,
    position: { x: record.x, y: record.y },
    data,
    style: {
      width,
      height,
      zIndex,
    },
  };
};

export const toFlowEdge = (record: BoardEdgeRecord): Edge => ({
  id: record.id,
  source: record.source,
  target: record.target,
  type: "smoothstep",
  label: record.label ?? undefined,
  data: record.data ?? {},
  style: {
    stroke: "hsl(var(--primary) / 0.8)",
    strokeWidth: 2,
    ...(record.style ?? {}),
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "hsl(var(--primary) / 0.8)",
  },
});

export const toBoardNodeRecord = (node: Node<BoardNodeData>): BoardNodeRecord => {
  const width = typeof node.style?.width === "number" ? node.style?.width : undefined;
  const height = typeof node.style?.height === "number" ? node.style?.height : undefined;
  const zIndex = typeof node.style?.zIndex === "number" ? node.style?.zIndex : undefined;

  return {
    id: node.id,
    type: node.type as BoardNodeRecord["type"],
    x: node.position.x,
    y: node.position.y,
    data: stripNodeData(node.data),
    width,
    height,
    zIndex,
  };
};
