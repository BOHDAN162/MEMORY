export type EditableNodeCallbacks = {
  isEditing?: boolean;
  onCommit?: (value: string) => void;
  onCancel?: () => void;
};

export type TextNodeData = {
  kind: "text";
  text: string;
} & EditableNodeCallbacks;

export type StickyNodeData = {
  kind: "sticky";
  title: string;
  text: string;
} & EditableNodeCallbacks;

export type ImageNodeData = {
  kind: "image";
  url: string;
  caption?: string;
} & EditableNodeCallbacks;

export type FrameNodeData = {
  kind: "frame";
  title: string;
};

export type InterestNodeData = {
  kind: "interest";
  title: string;
  cluster: string | null;
  clusterLabel: string;
  isActive?: boolean;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  isDragging?: boolean;
  isConnectSource?: boolean;
  isConnectTarget?: boolean;
  isPreviewTarget?: boolean;
};

export type BoardNodeData =
  | TextNodeData
  | StickyNodeData
  | ImageNodeData
  | FrameNodeData
  | InterestNodeData;

export type BoardNodeKind = BoardNodeData["kind"];

export type BoardTool = "select" | "hand" | "text" | "sticky" | "image" | "frame" | "connect";
