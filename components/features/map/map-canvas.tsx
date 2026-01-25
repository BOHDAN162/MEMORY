"use client";

import "@xyflow/react/dist/style.css";

import { saveMapPosition } from "@/app/actions/save-map-position";
import { saveMapPositions } from "@/app/actions/save-map-positions";
import { BoardToolbar } from "@/components/features/map/board/board-toolbar";
import {
  createDefaultNodeData,
  defaultNodeSize,
  isBoardNodeType,
  toBoardNodeRecord,
  toFlowEdge,
  toFlowNode,
} from "@/components/features/map/board/board-utils";
import type { BoardTool } from "@/components/features/map/board/board-types";
import type { BoardNodeData } from "@/components/features/map/board/board-types";
import {
  loadBoardStorage,
  persistBoardStorage,
  type BoardStorageError,
} from "@/components/features/map/board/board-storage";
import { FrameNode } from "@/components/features/map/board/nodes/frame-node";
import { ImageNode } from "@/components/features/map/board/nodes/image-node";
import { InterestNode } from "@/components/features/map/board/nodes/interest-node";
import { StickyNode } from "@/components/features/map/board/nodes/sticky-node";
import { TextNode } from "@/components/features/map/board/nodes/text-node";
import { clusterLabel, computeClusterLayout, placeMissingNodesNearClusters } from "@/lib/map/auto-layout";
import type { MapInterestNode, MapManualEdge } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnMove,
  type OnNodesChange,
  type OnNodeDrag,
  type Viewport,
} from "@xyflow/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { buttonVariants } from "@/components/ui/button";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const SAVE_DEBOUNCE_MS = 950;

type BoardFlowNode = Node<BoardNodeData>;

type MapCanvasProps = {
  interests: MapInterestNode[];
  manualEdges: MapManualEdge[];
};

const nodeTypes = {
  interest: InterestNode,
  text: TextNode,
  sticky: StickyNode,
  image: ImageNode,
  frame: FrameNode,
};

const EmptyMapState = () => (
  <div className="flex h-[60vh] min-h-[360px] w-full items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/60 text-center shadow-inner shadow-black/5">
    <div className="max-w-md space-y-3">
      <p className="text-sm font-semibold text-foreground">Интересы не выбраны</p>
      <p className="text-sm text-muted-foreground">
        Добавьте темы в разделе &laquo;Контент&raquo; или пройдите персонализацию, чтобы построить карту.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Link className={buttonVariants({ variant: "primary", size: "sm" })} href="/onboarding">
          Выбрать интересы
        </Link>
        <Link className={buttonVariants({ variant: "soft", size: "sm" })} href="/content">
          К контенту
        </Link>
      </div>
    </div>
  </div>
);

const buildInterestLayout = (interests: MapInterestNode[]) => {
  const savedPositions = new Map(
    interests
      .filter((interest): interest is MapInterestNode & { position: { x: number; y: number } } =>
        Boolean(interest.position),
      )
      .map((interest) => [interest.id, interest.position]),
  );

  const total = interests.length;
  const savedCount = savedPositions.size;
  const coverage = total === 0 ? 0 : savedCount / total;

  const baseLayout = computeClusterLayout(interests);
  const initialPositions = new Map(savedPositions);
  const newIds: string[] = [];

  if (coverage === 0) {
    baseLayout.forEach((position, id) => {
      initialPositions.set(id, position);
      newIds.push(id);
    });
  } else if (savedCount < total) {
    const { positionMap, newlyPositionedIds } = placeMissingNodesNearClusters(
      interests,
      initialPositions,
    );
    newlyPositionedIds.forEach((id) => newIds.push(id));
    positionMap.forEach((position, id) => initialPositions.set(id, position));
  }

  const flowNodes: BoardFlowNode[] = interests.map((interest) => ({
    id: interest.id,
    type: "interest",
    position: initialPositions.get(interest.id) ?? baseLayout.get(interest.id) ?? { x: 0, y: 0 },
    data: {
      kind: "interest",
      title: interest.title,
      cluster: interest.cluster,
      clusterLabel: clusterLabel(interest.cluster),
    },
  }));

  return {
    nodes: flowNodes,
    positionMap: initialPositions,
    newlyPositionedIds: newIds,
    shouldFitView: coverage < 0.5 && newIds.length > 0,
  };
};

const createSnapshot = (nodes: BoardFlowNode[], edges: Edge[]) => ({
  nodes: nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: { ...node.data },
    style: { ...(node.style ?? {}) },
  })),
  edges: edges.map((edge) => ({
    ...edge,
    data: { ...(edge.data ?? {}) },
    style: { ...(edge.style ?? {}) },
  })),
});

const MapCanvasInner = ({ interests }: MapCanvasProps) => {
  const reactFlow = useReactFlow();
  const { nodes: initialInterestNodes, positionMap, newlyPositionedIds, shouldFitView } = useMemo(
    () => buildInterestLayout(interests),
    [interests],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<BoardFlowNode>(initialInterestNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [activeTool, setActiveTool] = useState<BoardTool>("select");
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<BoardStorageError | null>(null);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "offline">("idle");
  const [saveMessage, setSaveMessage] = useState("Не сохранено");
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedNodeIds = useRef<Set<string>>(new Set());
  const lastSavedEdgeIds = useRef<Set<string>>(new Set());
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const historyRef = useRef<{ past: Array<ReturnType<typeof createSnapshot>>; future: Array<ReturnType<typeof createSnapshot>> }>(
    { past: [], future: [] },
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoadingBoard(true);
      const result = await loadBoardStorage();
      if (!mounted) return;

      if (result.error) {
        setStorageError(result.error);
        setIsLoadingBoard(false);
        setSaveState("error");
        setSaveMessage("Хранилище недоступно");
        return;
      }

      setBoardId(result.data.boardId);
      setStorageError(null);
      const boardNodes = result.data.nodes.map((record) => toFlowNode(record));
      const boardEdges = result.data.edges.map((record) => toFlowEdge(record));

      setNodes((prev) => {
        const existingIds = new Set(prev.map((node) => node.id));
        const merged = [...prev];
        boardNodes.forEach((node) => {
          if (!existingIds.has(node.id)) {
            merged.push(node);
          }
        });
        return merged;
      });
      setEdges(boardEdges);
      lastSavedNodeIds.current = new Set(boardNodes.map((node) => node.id));
      lastSavedEdgeIds.current = new Set(boardEdges.map((edge) => edge.id));
      setSaveState("idle");
      setSaveMessage("Сохранено");
      setIsLoadingBoard(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [setEdges, setNodes]);

  useEffect(() => {
    if (!shouldFitView || nodes.length === 0) return;
    const timeout = setTimeout(() => {
      reactFlow.fitView({ padding: 0.2, duration: 300 });
    }, 80);
    return () => clearTimeout(timeout);
  }, [nodes.length, reactFlow, shouldFitView]);

  const autoSavePayload = useMemo(
    () =>
      newlyPositionedIds
        .map((id) => {
          const position = positionMap.get(id);
          if (!position) return null;
          return {
            interestId: id,
            x: position.x,
            y: position.y,
          };
        })
        .filter(
          (
            item,
          ): item is {
            interestId: string;
            x: number;
            y: number;
          } => Boolean(item),
        ),
    [newlyPositionedIds, positionMap],
  );

  useEffect(() => {
    if (autoSavePayload.length === 0) return;
    void saveMapPositions({ positions: autoSavePayload }).catch(() => {});
  }, [autoSavePayload]);

  const scheduleSave = useCallback(
    (force = false) => {
      if (!boardId || storageError?.missingTables) return;
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      const runSave = async () => {
        const boardNodes = nodes.filter((node) => (node.type ? isBoardNodeType(node.type) : false));
        const boardEdges = edges;
        const nodeRecords = boardNodes.map((node) => toBoardNodeRecord(node));
        const edgeRecords = boardEdges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          data: edge.data ?? {},
          style: edge.style ? (edge.style as Record<string, unknown>) : {},
        }));
        const currentNodeIds = new Set(nodeRecords.map((record) => record.id));
        const currentEdgeIds = new Set(edgeRecords.map((record) => record.id));
        const deletedNodeIds = Array.from(lastSavedNodeIds.current).filter(
          (id) => !currentNodeIds.has(id),
        );
        const deletedEdgeIds = Array.from(lastSavedEdgeIds.current).filter(
          (id) => !currentEdgeIds.has(id),
        );

        setSaveState("saving");
        setSaveMessage("Сохранение...");

        const result = await persistBoardStorage({
          boardId,
          nodes: nodeRecords,
          edges: edgeRecords,
          deletedNodeIds,
          deletedEdgeIds,
        });

        if (result.error) {
          setSaveState(result.error.missingTables ? "error" : "error");
          setSaveMessage("Ошибка сохранения");
          setStorageError(result.error);
          return;
        }

        lastSavedNodeIds.current = currentNodeIds;
        lastSavedEdgeIds.current = currentEdgeIds;
        setSaveState("saved");
        setSaveMessage("Сохранено");
      };

      if (force) {
        void runSave();
        return;
      }

      saveTimeoutRef.current = window.setTimeout(() => {
        void runSave();
      }, SAVE_DEBOUNCE_MS);
    },
    [boardId, edges, nodes, storageError?.missingTables],
  );

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

  const commitNodeEdit = useCallback(
    (id: string, value: string) => {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== id) return node;
          if (node.data.kind === "text") {
            return { ...node, data: { ...node.data, text: value } };
          }
          if (node.data.kind === "sticky") {
            return { ...node, data: { ...node.data, text: value } };
          }
          if (node.data.kind === "image") {
            return { ...node, data: { ...node.data, url: value } };
          }
          return node;
        }),
      );
      setEditingNodeId(null);
      scheduleSave();
    },
    [scheduleSave, setNodes],
  );

  const cancelNodeEdit = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  const renderNodes = useMemo<BoardFlowNode[]>(() => {
    return nodes.map((node) => {
      if (node.data.kind === "interest") {
        return {
          ...node,
          data: {
            ...node.data,
            isSelected: node.selected,
            isActive: connectFromId === node.id,
            isConnectSource: connectFromId === node.id,
            isConnectTarget: activeTool === "connect" && Boolean(connectFromId) && node.id === hoverNodeId,
            isPreviewTarget: activeTool === "connect" && Boolean(connectFromId) && node.id === hoverNodeId,
            isDragging: node.dragging,
          },
        };
      }

      const isEditing = node.id === editingNodeId;
      return {
        ...node,
        data: {
          ...node.data,
          isEditing,
          onCommit: (value: string) => commitNodeEdit(node.id, value),
          onCancel: cancelNodeEdit,
        },
      };
    });
  }, [activeTool, cancelNodeEdit, commitNodeEdit, connectFromId, editingNodeId, hoverNodeId, nodes]);

  const previewEdge = useMemo(() => {
    if (activeTool !== "connect" || !connectFromId || !hoverNodeId || connectFromId === hoverNodeId) {
      return null;
    }
    return {
      id: `preview-${connectFromId}-${hoverNodeId}`,
      source: connectFromId,
      target: hoverNodeId,
      type: "smoothstep",
      animated: true,
      selectable: false,
      focusable: false,
      style: {
        stroke: "hsl(var(--primary) / 0.6)",
        strokeWidth: 2,
        strokeDasharray: "6 6",
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary) / 0.7)" },
    } satisfies Edge;
  }, [activeTool, connectFromId, hoverNodeId]);

  const renderedEdges = useMemo(() => (previewEdge ? [...edges, previewEdge] : edges), [edges, previewEdge]);

  const handleNodesChange: OnNodesChange<BoardFlowNode> = useCallback(
    (changes) => {
      onNodesChange(changes);
      const shouldSave = changes.some(
        (change) => change.type === "dimensions" && "resizing" in change && !change.resizing,
      );
      if (shouldSave) {
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

  const handleNodeDragStop: OnNodeDrag<BoardFlowNode> = useCallback(
    (_event, node) => {
      if (node.type === "interest") {
        void saveMapPosition({ interestId: node.id, x: node.position.x, y: node.position.y });
      } else {
        scheduleSave();
      }
      historyRef.current.past.push(createSnapshot(nodes, edges));
      historyRef.current.future = [];
    },
    [edges, nodes, scheduleSave],
  );

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool === "select" || activeTool === "connect" || activeTool === "hand") {
        setEditingNodeId(null);
        setConnectFromId(null);
        return;
      }

      if (!boardId || storageError?.missingTables) {
        return;
      }

      const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = crypto.randomUUID();
      const data = createDefaultNodeData(activeTool);
      const size = defaultNodeSize(activeTool);
      const zIndex = activeTool === "frame" ? 0 : 2;

      const node: BoardFlowNode = {
        id,
        type: activeTool,
        position,
        data,
        style: { width: size.width, height: size.height, zIndex },
      };

      historyRef.current.past.push(createSnapshot(nodes, edges));
      historyRef.current.future = [];
      setNodes((prev) => [...prev, node]);

      if (activeTool === "text" || activeTool === "sticky" || activeTool === "image") {
        setEditingNodeId(id);
      }

      scheduleSave();
    },
    [activeTool, boardId, edges, nodes, reactFlow, scheduleSave, setNodes, storageError?.missingTables],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: BoardFlowNode) => {
      if (activeTool !== "connect") return;
      if (node.id === connectFromId) {
        setConnectFromId(null);
        return;
      }

      if (!connectFromId) {
        setConnectFromId(node.id);
        return;
      }

      const id = crypto.randomUUID();
      const newEdge: Edge = {
        id,
        source: connectFromId,
        target: node.id,
        type: "smoothstep",
        style: {
          stroke: "hsl(var(--primary) / 0.8)",
          strokeWidth: 2,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary) / 0.8)" },
      };

      historyRef.current.past.push(createSnapshot(nodes, edges));
      historyRef.current.future = [];
      setEdges((prev) => addEdge(newEdge, prev));
      setConnectFromId(null);
      scheduleSave();
    },
    [activeTool, connectFromId, edges, nodes, scheduleSave, setEdges],
  );

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: BoardFlowNode) => {
      if (node.data.kind === "text" || node.data.kind === "sticky" || node.data.kind === "image") {
        setEditingNodeId(node.id);
      }
    },
    [],
  );

  const handleViewportMove: OnMove = useCallback((_event: MouseEvent | TouchEvent | null, _viewport: Viewport) => {}, []);

  const handleSelectionDelete = useCallback(() => {
    const selectedNodeIds = nodes
      .filter((node) => node.selected)
      .filter((node) => node.type !== "interest")
      .map((node) => node.id);
    const selectedEdgeIds = edges.filter((edge) => edge.selected).map((edge) => edge.id);

    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;

    historyRef.current.past.push(createSnapshot(nodes, edges));
    historyRef.current.future = [];

    if (selectedNodeIds.length > 0) {
      setNodes((prev) => prev.filter((node) => !selectedNodeIds.includes(node.id)));
    }
    if (selectedEdgeIds.length > 0) {
      setEdges((prev) => prev.filter((edge) => !selectedEdgeIds.includes(edge.id)));
    }
    scheduleSave();
  }, [edges, nodes, scheduleSave, setEdges, setNodes]);

  const handleUndo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    historyRef.current.past = past.slice(0, -1);
    historyRef.current.future = [createSnapshot(nodes, edges), ...future];
    setNodes(previous.nodes);
    setEdges(previous.edges);
    scheduleSave(true);
  }, [edges, nodes, scheduleSave, setEdges, setNodes]);

  const handleRedo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (future.length === 0) return;
    const next = future[0];
    historyRef.current.future = future.slice(1);
    historyRef.current.past = [...past, createSnapshot(nodes, edges)];
    setNodes(next.nodes);
    setEdges(next.edges);
    scheduleSave(true);
  }, [edges, nodes, scheduleSave, setEdges, setNodes]);

  const handleBringToFront = useCallback(() => {
    const selected = nodes.filter((node) => node.selected && node.type !== "interest");
    if (selected.length === 0) return;
    const maxZ = Math.max(0, ...nodes.map((node) => (typeof node.style?.zIndex === "number" ? node.style?.zIndex : 0)));
    setNodes((prev) =>
      prev.map((node) =>
        selected.some((selectedNode) => selectedNode.id === node.id)
          ? { ...node, style: { ...(node.style ?? {}), zIndex: maxZ + 1 } }
          : node,
      ),
    );
    scheduleSave();
  }, [nodes, scheduleSave, setNodes]);

  const handleSendToBack = useCallback(() => {
    const selected = nodes.filter((node) => node.selected && node.type !== "interest");
    if (selected.length === 0) return;
    const minZ = Math.min(0, ...nodes.map((node) => (typeof node.style?.zIndex === "number" ? node.style?.zIndex : 0)));
    setNodes((prev) =>
      prev.map((node) =>
        selected.some((selectedNode) => selectedNode.id === node.id)
          ? { ...node, style: { ...(node.style ?? {}), zIndex: minZ - 1 } }
          : node,
      ),
    );
    scheduleSave();
  }, [nodes, scheduleSave, setNodes]);

  const handleKeybinds = useCallback(
    (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleSelectionDelete();
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "v") setActiveTool("select");
      if (key === "h") setActiveTool("hand");
      if (key === "t") setActiveTool("text");
      if (key === "s") setActiveTool("sticky");
      if (key === "c") setActiveTool("connect");
    },
    [handleRedo, handleSelectionDelete, handleUndo],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeybinds);
    return () => window.removeEventListener("keydown", handleKeybinds);
  }, [handleKeybinds]);

  const handleToolChange = useCallback((tool: BoardTool) => {
    setActiveTool(tool);
    if (tool !== "connect") {
      setConnectFromId(null);
    }
  }, []);

  const selectionCount = nodes.filter((node) => node.selected && node.type !== "interest").length;
  const selectedEdgeCount = edges.filter((edge) => edge.selected).length;
  const canDelete = selectionCount > 0 || selectedEdgeCount > 0;
  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;
  const canReorder = selectionCount > 0;

  const storageNotice = useMemo(() => {
    if (!storageError) return null;
    if (!storageError.missingTables) return storageError.message;
    if (process.env.NODE_ENV !== "production") {
      return "Board storage not initialized. Apply the Supabase migration for boards.";
    }
    return "Board storage not initialized.";
  }, [storageError]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_20%_15%,rgba(129,140,248,0.16),rgba(15,23,42,0.7)),radial-gradient(circle_at_80%_85%,rgba(56,189,248,0.12),rgba(15,23,42,0.75))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(124,58,237,0.12),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_70%,rgba(79,70,229,0.08),transparent_50%)]" />
      <ReactFlow
        nodes={renderNodes}
        edges={renderedEdges}
        nodeTypes={nodeTypes}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        onMove={handleViewportMove}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={handlePaneClick}
        onNodeMouseEnter={(_event, node) => setHoverNodeId(node.id)}
        onNodeMouseLeave={() => setHoverNodeId(null)}
        panOnDrag={activeTool === "hand"}
        selectionOnDrag={activeTool === "select"}
        multiSelectionKeyCode={["Shift"]}
        deleteKeyCode={null}
        nodesDraggable={activeTool !== "hand"}
        nodesConnectable={activeTool === "connect"}
        proOptions={{ hideAttribution: true }}
        className={cn(
          "bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.03),transparent_35%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.03),transparent_35%)]",
          activeTool === "connect" && "cursor-crosshair",
          activeTool === "hand" && "cursor-grab",
        )}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.6} color="rgba(255,255,255,0.08)" />
      </ReactFlow>

      <div className="absolute inset-x-4 bottom-4 z-20 flex justify-center">
        <BoardToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onDelete={handleSelectionDelete}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSave={() => scheduleSave(true)}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          canUndo={canUndo}
          canRedo={canRedo}
          canDelete={canDelete}
          canReorder={canReorder}
          saveState={saveState}
          saveMessage={saveMessage}
        />
      </div>

      {storageNotice ? (
        <div className="absolute left-4 top-4 z-30 max-w-md rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-semibold">{storageNotice}</p>
          <p className="mt-2 text-xs text-destructive/80">
            Если вы администратор, примените SQL миграцию Supabase для tables boards/board_nodes/board_edges.
          </p>
          <button
            type="button"
            className={buttonVariants({ variant: "soft", size: "sm" })}
            onClick={() => void loadBoardStorage().then((result) => {
              if (result.error) {
                setStorageError(result.error);
                return;
              }
              setStorageError(null);
              setBoardId(result.data.boardId);
              const boardNodes = result.data.nodes.map((record) => toFlowNode(record));
              const boardEdges = result.data.edges.map((record) => toFlowEdge(record));
              setNodes((prev) => {
                const existingIds = new Set(prev.map((node) => node.id));
                const merged = [...prev];
                boardNodes.forEach((node) => {
                  if (!existingIds.has(node.id)) {
                    merged.push(node);
                  }
                });
                return merged;
              });
              setEdges(boardEdges);
              lastSavedNodeIds.current = new Set(boardNodes.map((node) => node.id));
              lastSavedEdgeIds.current = new Set(boardEdges.map((edge) => edge.id));
            })}
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoadingBoard ? (
        <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-full bg-muted/70 px-3 py-1 text-xs text-muted-foreground">
          Загружаем доску...
        </div>
      ) : null}
    </div>
  );
};

export const MapCanvas = ({ interests, manualEdges }: MapCanvasProps) => {
  if (interests.length === 0) {
    return <EmptyMapState />;
  }

  return (
    <ReactFlowProvider>
      <MapCanvasInner interests={interests} manualEdges={manualEdges} />
    </ReactFlowProvider>
  );
};
