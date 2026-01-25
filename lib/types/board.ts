export type BoardNodeType = "text" | "sticky" | "image" | "frame";

export type BoardNodeRecord = {
  id: string;
  type: BoardNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown> | null;
  style?: Record<string, unknown> | null;
};

export type BoardEdgeRecord = {
  id: string;
  source: string;
  target: string;
  type?: string | null;
  data?: Record<string, unknown> | null;
};

export type BoardViewport = {
  x: number;
  y: number;
  zoom: number;
};
