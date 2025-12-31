export type MapInterestNode = {
  id: string;
  title: string;
  cluster: string | null;
  position: { x: number; y: number } | null;
};

export type MapManualEdge = {
  sourceId: string;
  targetId: string;
  createdAt?: string | null;
};
