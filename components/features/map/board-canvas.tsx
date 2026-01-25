"use client";

import "@xyflow/react/dist/style.css";

import {
  addEdge,
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type OnEdgesChange,
  type OnMove,
  type OnMoveEnd,
  type OnNodesChange,
  type OnNodeDrag,
  type Viewport,
  type Node,
} from "@xyflow/react";
import {
  Hand,
  Image as ImageIcon,
  Link2,
  MousePointer2,
  StickyNote,
  Type,
  Square,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteBoardEdges,
  deleteBoardNodes,
  upsertBoardEdges,
  upsertBoardNodes,
  upsertBoardViewport,
} from "@/lib/supabase/board";
import type {
  BoardEdgeRecord,
  BoardNodeRecord,
  BoardNodeType,
  BoardViewport,
} from "@/lib/types";
import type { BoardNodeData } from "@/components/features/map/board-node-types";
import { TextNode } from "@/components/features/map/text-node";
import { StickyNode } from "@/components/features/map/sticky-node";
import { ImageNode } from "@/components/features/map/image-node";
import { FrameNode } from "@/components/features/map/frame-node";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const SAVE_DEBOUNCE_MS = 900;

const nodeTypes = {
  text: TextNode,
  sticky: StickyNode,
  image: ImageNode,
  frame: FrameNode,
};

type BoardFlowNode = Node<BoardNodeData>;

type BoardTool = "select" | "text" | "sticky" | "image" | "frame" | "connect";

type BoardCanvasProps = {
  boardId: string;
  nodes: BoardNodeRecord[];
  edges: BoardEdgeRecord[];
  viewport: BoardViewport | null;
};

const TOOL_LABELS: Record<BoardTool, string> = {
  select: "Select",
  text: "Text",
  sticky: "Sticky",
  image: "Image",
  frame: "Frame",
  connect: "Connect",
};

const TOOL_ICONS: Record<BoardTool, typeof MousePointer2> = {
  select: MousePointer2,
  text: Type,
  sticky: StickyNote,
  image: ImageIcon,
  frame: Square,
  connect: Link2,
};

const DEFAULT_NODE_SIZES: Record<BoardNodeType, { width: number; height: number }> = {
  text: { width: 220, height: 120 },
  sticky: { width: 240, height: 180 },
  image: { width: 260, height: 180 },
  frame: { width: 320, height: 240 },
};

const toFlowNode = (record: BoardNodeRecord): BoardFlowNode => {
  const size = DEFAULT_NODE_SIZES[record.type];
  const width = (record.style?.width as number | undefined) ?? size.width;
  const height = (record.style?.height as number | undefined) ?? size.height;
  const zIndex = record.type === "frame" ? 0 : 2;
  const data = record.data ? (record.data as BoardNodeData) : createNodeData(record.type);

  return {
    id: record.id,
    type: record.type,
    position: record.position,
    data,
    style: {
      width,
      height,
      zIndex,
    },
  };
};

const toFlowEdge = (record: BoardEdgeRecord): Edge => ({
  id: record.id,
  source: record.source,
  target: record.target,
  type: record.type ?? "smoothstep",
  data: record.data ?? {},
  animated: false,
  style: {
    stroke: "hsl(var(--primary) / 0.7)",
    strokeWidth: 2,
  },
});

const toRecordNode = (node: BoardFlowNode): BoardNodeRecord => {
  const { width, height } = node.style ?? {};
  const style: BoardNodeRecord["style"] = {
    width: typeof width === "number" ? width : undefined,
    height: typeof height === "number" ? height : undefined,
  };

  return {
    id: node.id,
    type: node.type as BoardNodeType,
    position: node.position,
    data: node.data as BoardNodeRecord["data"],
    style,
  };
};

const toRecordEdge = (edge: Edge): BoardEdgeRecord => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  type: edge.type ?? null,
  data: (edge.data as BoardEdgeRecord["data"]) ?? null,
});

const createNodeData = (tool: BoardTool): BoardNodeData => {
  switch (tool) {
    case "text":
      return { kind: "text", text: "" };
    case "sticky":
      return { kind: "sticky", title: "Sticky", text: "" };
    case "image":
      return { kind: "image", url: "" };
    case "frame":
      return { kind: "frame", title: "Frame" };
    default:
      return { kind: "text", text: "" };
  }
};

const BoardCanvasInner = ({ boardId, nodes: initialNodes, edges: initialEdges, viewport }: BoardCanvasProps) => {
  const reactFlow = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<BoardFlowNode>(
    initialNodes.map(toFlowNode),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges.map(toFlowEdge));
  const [tool, setTool] = useState<BoardTool>("select");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [viewportState, setViewportState] = useState<Viewport>(
    viewport ?? { x: 0, y: 0, zoom: 1 },
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "offline">(
    "idle",
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedNodeIds = useRef<Set<string>>(new Set(initialNodes.map((node) => node.id)));
  const lastSavedEdgeIds = useRef<Set<string>>(new Set(initialEdges.map((edge) => edge.id)));

  useEffect(() => {
    if (viewport) {
      setViewportState(viewport);
    }
  }, [viewport]);

  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setSaveState("offline");
        setSaveMessage("Supabase недоступен");
        return;
      }

      setSaveState("saving");
      setSaveMessage("Сохраняем…");

      const records = nodes.map(toRecordNode);
      const edgeRecords = edges.map(toRecordEdge);
      const currentNodeIds = new Set(records.map((record) => record.id));
      const currentEdgeIds = new Set(edgeRecords.map((record) => record.id));
      const deletedNodes = Array.from(lastSavedNodeIds.current).filter(
        (id) => !currentNodeIds.has(id),
      );
      const deletedEdges = Array.from(lastSavedEdgeIds.current).filter(
        (id) => !currentEdgeIds.has(id),
      );

      const [nodesResult, edgesResult, deleteNodesResult, deleteEdgesResult, viewportResult] =
        await Promise.all([
          upsertBoardNodes(supabase, boardId, records),
          upsertBoardEdges(supabase, boardId, edgeRecords),
          deleteBoardNodes(supabase, boardId, deletedNodes),
          deleteBoardEdges(supabase, boardId, deletedEdges),
          upsertBoardViewport(supabase, boardId, viewportState),
        ]);

      const errorMessage =
        nodesResult.error ||
        edgesResult.error ||
        deleteNodesResult.error ||
        deleteEdgesResult.error ||
        viewportResult.error ||
        null;

      if (errorMessage) {
        setSaveState("error");
        setSaveMessage("Ошибка сохранения");
        return;
      }

      lastSavedNodeIds.current = currentNodeIds;
      lastSavedEdgeIds.current = currentEdgeIds;
      setSaveState("saved");
      setSaveMessage("Сохранено");
    }, SAVE_DEBOUNCE_MS);
  }, [boardId, edges, nodes, viewportState]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (saveState !== "saved") return;
    const timeout = window.setTimeout(() => setSaveState("idle"), 1500);
    return () => window.clearTimeout(timeout);
  }, [saveState]);

  const updateNodeData = useCallback(
    (id: string, updater: (data: BoardNodeData) => BoardNodeData) => {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== id) return node;
          return { ...node, data: updater(node.data) };
        }),
      );
    },
    [setNodes],
  );

  const handleNodeCommit = useCallback(
    (id: string, value: string) => {
      updateNodeData(id, (data) => {
        if (data.kind === "text") {
          return { ...data, text: value };
        }
        if (data.kind === "sticky") {
          return { ...data, text: value };
        }
        if (data.kind === "image") {
          return { ...data, url: value };
        }
        return data;
      });
      setEditingNodeId(null);
      scheduleSave();
    },
    [scheduleSave, updateNodeData],
  );

  const handleNodeCancel = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  const renderNodes = useMemo<BoardFlowNode[]>(
    () =>
      nodes.map((node) => {
        if (node.id !== editingNodeId) {
          return {
            ...node,
            data: { ...node.data, isEditing: false },
          };
        }

        return {
          ...node,
          data: {
            ...node.data,
            isEditing: true,
            onCommit: (value: string) => handleNodeCommit(node.id, value),
            onCancel: handleNodeCancel,
          },
        };
      }),
    [editingNodeId, handleNodeCancel, handleNodeCommit, nodes],
  );

  const handleNodesChange: OnNodesChange<BoardFlowNode> = useCallback(
    (changes) => {
      onNodesChange(changes);
      const hasResizeEnd = changes.some(
        (change) => change.type === "dimensions" && "resizing" in change && !change.resizing,
      );
      if (hasResizeEnd) {
        scheduleSave();
      }
    },
    [onNodesChange, scheduleSave],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      if (changes.some((change) => change.type === "remove")) {
        scheduleSave();
      }
    },
    [onEdgesChange, scheduleSave],
  );

  const handleNodeDragStop: OnNodeDrag<BoardFlowNode> = useCallback(() => {
    scheduleSave();
  }, [scheduleSave]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (tool !== "connect") return;
      const id = crypto.randomUUID();
      setEdges((prev) =>
        addEdge(
          {
            ...connection,
            id,
            type: "smoothstep",
            style: { stroke: "hsl(var(--primary) / 0.7)", strokeWidth: 2 },
          },
          prev,
        ),
      );
      scheduleSave();
    },
    [scheduleSave, setEdges, tool],
  );

  const handlePaneClick = useCallback(
    (event: ReactMouseEvent) => {
      if (tool === "select" || tool === "connect") {
        setEditingNodeId(null);
        return;
      }

      const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = crypto.randomUUID();
      const data = createNodeData(tool);
      const size = DEFAULT_NODE_SIZES[tool];
      const zIndex = tool === "frame" ? 0 : 2;

      const node: BoardFlowNode = {
        id,
        type: tool,
        position,
        data,
        style: { width: size.width, height: size.height, zIndex },
      };

      setNodes((prev) => [...prev, node]);

      if (tool === "text" || tool === "sticky" || tool === "image") {
        setEditingNodeId(id);
      }

      scheduleSave();
    },
    [reactFlow, scheduleSave, setNodes, tool],
  );

  const handleNodeDoubleClick = useCallback(
    (_event: ReactMouseEvent, node: BoardFlowNode) => {
      if (node.data.kind === "text" || node.data.kind === "sticky" || node.data.kind === "image") {
        setEditingNodeId(node.id);
      }
    },
    [],
  );

  const handleViewportMove: OnMove = useCallback((_event, nextViewport) => {
    setViewportState(nextViewport);
  }, []);

  const handleViewportMoveEnd: OnMoveEnd = useCallback(() => {
    scheduleSave();
  }, [scheduleSave]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditingNodeId(null);
        if (tool === "connect") {
          setTool("select");
        }
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

      const selectedNodeIds = nodes.filter((node) => node.selected).map((node) => node.id);
      const selectedEdgeIds = edges.filter((edge) => edge.selected).map((edge) => edge.id);

      if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;

      event.preventDefault();

      if (selectedNodeIds.length > 0) {
        setNodes((prev) => prev.filter((node) => !selectedNodeIds.includes(node.id)));
      }
      if (selectedEdgeIds.length > 0) {
        setEdges((prev) => prev.filter((edge) => !selectedEdgeIds.includes(edge.id)));
      }

      scheduleSave();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [edges, nodes, scheduleSave, setEdges, setNodes, tool]);

  const toolbarItems: BoardTool[] = ["select", "text", "sticky", "image", "frame", "connect"];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border/80 bg-[radial-gradient(circle_at_20%_15%,rgba(129,140,248,0.16),rgba(15,23,42,0.7)),radial-gradient(circle_at_80%_85%,rgba(56,189,248,0.12),rgba(15,23,42,0.75))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(124,58,237,0.12),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_70%,rgba(79,70,229,0.08),transparent_50%)]" />
      <ReactFlow
        nodes={renderNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        viewport={viewportState}
        onMove={handleViewportMove}
        onMoveEnd={handleViewportMoveEnd}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodeDoubleClick={handleNodeDoubleClick}
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
        selectionOnDrag
        multiSelectionKeyCode={["Meta", "Control"]}
        selectionKeyCode={["Shift"]}
        panOnDrag={tool === "select"}
        nodesConnectable={tool === "connect"}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        className={cn(
          "bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.03),transparent_35%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.03),transparent_35%)]",
          tool === "connect" && "cursor-crosshair",
        )}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.4}
          color="rgba(255,255,255,0.08)"
        />
        <Panel
          position="top-left"
          className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/95 px-3 py-3 shadow-xl shadow-black/15 backdrop-blur"
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Hand className="h-3.5 w-3.5" />
            Board tools
          </div>
          <div className="flex flex-col gap-2">
            {toolbarItems.map((item) => {
              const Icon = TOOL_ICONS[item];
              const isActive = tool === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTool(item)}
                  className={buttonVariants({
                    variant: isActive ? "primary" : "soft",
                    size: "sm",
                    className: "justify-start gap-2",
                  })}
                >
                  <Icon className="h-4 w-4" />
                  {TOOL_LABELS[item]}
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel position="top-right" className="rounded-2xl border border-border/80 bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-lg shadow-black/10 backdrop-blur">
          {saveMessage ? <span>{saveMessage}</span> : <span>Готово</span>}
          {saveState === "offline" || saveState === "error" ? (
            <span className="ml-2 text-destructive">Проверьте сеть</span>
          ) : null}
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const BoardCanvas = (props: BoardCanvasProps) => {
  return (
    <ReactFlowProvider>
      <BoardCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
