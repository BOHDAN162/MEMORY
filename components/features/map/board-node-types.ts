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

export type BoardNodeData = TextNodeData | StickyNodeData | ImageNodeData | FrameNodeData;
