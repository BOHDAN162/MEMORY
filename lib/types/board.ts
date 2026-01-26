export type BoardNodeType = "text" | "sticky" | "card" | "image" | "frame";

export type BoardNodeRecord = {
  id: string;
  type: BoardNodeType;
  x: number;
  y: number;
  data: Record<string, unknown> | null;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
};

export type BoardEdgeRecord = {
  id: string;
  source: string;
  target: string;
  label?: string | null;
  data?: Record<string, unknown> | null;
  style?: Record<string, unknown> | null;
};

export type BoardViewport = {
  x: number;
  y: number;
  zoom: number;
};
