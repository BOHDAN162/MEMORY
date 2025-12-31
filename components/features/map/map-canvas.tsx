"use client";

import "@xyflow/react/dist/style.css";

import { createManualEdgeAction } from "@/app/actions/create-manual-edge";
import { deleteManualEdgeAction } from "@/app/actions/delete-manual-edge";
import { saveMapPosition } from "@/app/actions/save-map-position";
import { saveMapPositions } from "@/app/actions/save-map-positions";
import { InterestNode } from "@/components/features/map/interest-node";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { clusterKey, computeClusterLayout, placeMissingNodesNearClusters } from "@/lib/map/auto-layout";
import type { MapInterestNode, MapManualEdge } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { CircleHelp, Hand, Maximize2, MousePointer2, RefreshCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type OnEdgesChange,
  type Node,
  type OnNodesChange,
  type OnNodeDrag,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

type InterestNodeData = {
  title: string;
  cluster: string | null;
  clusterLabel: string;
  isActive?: boolean;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  isDragging?: boolean;
};

type MapCanvasProps = {
  interests: MapInterestNode[];
  manualEdges: MapManualEdge[];
};

type InterestFlowNode = Node<InterestNodeData>;

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
const nodeTypes = { interest: InterestNode };

type ManualEdgeState = {
  sourceId: string;
  targetId: string;
};

const normalizeEdgePair = (a: string, b: string): [string, string] => {
  if (a.localeCompare(b) <= 0) return [a, b];
  return [b, a];
};

const edgePairKey = (a: string, b: string) => normalizeEdgePair(a, b).join("|");

const manualEdgeId = (a: string, b: string) => {
  const [source, target] = normalizeEdgePair(a, b);
  return `m:${source}-${target}`;
};

const autoEdgeId = (cluster: string, a: string, b: string) => {
  const [source, target] = normalizeEdgePair(a, b);
  return `a:${cluster}:${source}-${target}`;
};

const EDGE_TRANSITION = "stroke 180ms ease, stroke-width 180ms ease, opacity 180ms ease";

const AUTO_EDGE_STYLE = {
  stroke: "hsl(var(--foreground) / 0.22)",
  strokeWidth: 1.35,
  opacity: 0.65,
  transition: EDGE_TRANSITION,
};

const MANUAL_EDGE_STYLE = {
  stroke: "hsl(var(--primary) / 0.85)",
  strokeWidth: 1.8,
  opacity: 0.75,
  transition: EDGE_TRANSITION,
};

const toManualEdgeState = (edges: MapManualEdge[]): ManualEdgeState[] => {
  const unique = new Map<string, ManualEdgeState>();

  edges.forEach((edge) => {
    if (!edge?.sourceId || !edge?.targetId) return;
    if (edge.sourceId === edge.targetId) return;
    const [sourceId, targetId] = normalizeEdgePair(edge.sourceId, edge.targetId);
    unique.set(edgePairKey(sourceId, targetId), { sourceId, targetId });
  });

  return Array.from(unique.values());
};

const buildManualEdge = (edge: ManualEdgeState): Edge => ({
  id: manualEdgeId(edge.sourceId, edge.targetId),
  source: edge.sourceId,
  target: edge.targetId,
  type: "smoothstep",
  animated: false,
  style: MANUAL_EDGE_STYLE,
  data: { kind: "manual" },
});

const buildAutoEdges = (nodes: MapInterestNode[]): Edge[] => {
  const grouped = new Map<string, MapInterestNode[]>();

  nodes.forEach((node) => {
    const key = clusterKey(node.cluster);
    const list = grouped.get(key) ?? [];
    list.push(node);
    grouped.set(key, list);
  });

  const edges: Edge[] = [];

  grouped.forEach((clusterNodes, cluster) => {
    const sorted = [...clusterNodes].sort(
      (a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
    );

    if (sorted.length <= 1) return;

    if (sorted.length <= 6) {
      for (let i = 0; i < sorted.length - 1; i += 1) {
        const [sourceId, targetId] = normalizeEdgePair(sorted[i]!.id, sorted[i + 1]!.id);
        edges.push({
          id: autoEdgeId(cluster, sourceId, targetId),
          source: sourceId,
          target: targetId,
          type: "smoothstep",
          animated: false,
          style: AUTO_EDGE_STYLE,
          data: { kind: "auto", cluster },
        });
      }
    } else {
      const hub = sorted[0]!;
      const spokes = sorted.slice(1, 7);
      spokes.forEach((node) => {
        const [sourceId, targetId] = normalizeEdgePair(hub.id, node.id);
        edges.push({
          id: autoEdgeId(cluster, sourceId, targetId),
          source: sourceId,
          target: targetId,
          type: "smoothstep",
          animated: false,
          style: AUTO_EDGE_STYLE,
          data: { kind: "auto", cluster },
        });
      });
    }
  });

  const unique = new Map<string, Edge>();
  edges.forEach((edge) => unique.set(edge.id, edge));
  return Array.from(unique.values());
};

const mergeEdges = (autoEdges: Edge[], manualEdges: ManualEdgeState[]): Edge[] => {
  const manualSet = new Set(manualEdges.map((edge) => edgePairKey(edge.sourceId, edge.targetId)));
  const filteredAuto = autoEdges.filter(
    (edge) => !manualSet.has(edgePairKey(edge.source, edge.target)),
  );

  const manualFlowEdges = manualEdges.map((edge) => buildManualEdge(edge));

  return [...filteredAuto, ...manualFlowEdges];
};

const hasPositionChanged = (
  previous: { x: number; y: number } | undefined,
  next: { x: number; y: number } | undefined,
) => {
  if (!previous || !next) return true;
  const dx = previous.x - next.x;
  const dy = previous.y - next.y;
  return Math.hypot(dx, dy) > 0.5;
};

const buildLayout = (interests: MapInterestNode[]) => {
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

  const flowNodes: InterestFlowNode[] = interests.map((interest) => ({
    id: interest.id,
    type: "interest",
    position: initialPositions.get(interest.id) ?? baseLayout.get(interest.id) ?? { x: 0, y: 0 },
    data: {
      title: interest.title,
      cluster: interest.cluster,
      clusterLabel: clusterKey(interest.cluster),
    },
  }));

  return {
    nodes: flowNodes,
    positionMap: initialPositions,
    newlyPositionedIds: newIds,
    shouldFitView: coverage < 0.5 && newIds.length > 0,
  };
};

const MapCanvasInner = ({ interests, manualEdges }: MapCanvasProps) => {
  const { nodes: initialNodes, positionMap, newlyPositionedIds, shouldFitView } = useMemo(
    () => buildLayout(interests),
    [interests],
  );
  const initialManualEdges = useMemo<ManualEdgeState[]>(() => toManualEdgeState(manualEdges), [manualEdges]);
  const autoEdges = useMemo(() => buildAutoEdges(interests), [interests]);
  const initialEdges = useMemo(
    () => mergeEdges(autoEdges, initialManualEdges),
    [autoEdges, initialManualEdges],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<InterestFlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [manualEdgesState, setManualEdgesState] = useState<ManualEdgeState[]>(initialManualEdges);
  const [lastSavedPositions, setLastSavedPositions] = useState<
    Map<string, { x: number; y: number }>
  >(() => new Map(initialNodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }])));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null,
  );
  const toastTimeoutRef = useRef<number | null>(null);
  const lastSuccessAtRef = useRef(0);
  const [connectMode, setConnectMode] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeError, setEdgeError] = useState<string | null>(null);
  const [edgePendingKey, setEdgePendingKey] = useState<string | null>(null);
  const reactFlow = useReactFlow();
  const hasFittedRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionHint, setSelectionHint] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isResettingLayout, setIsResettingLayout] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const router = useRouter();
  const selectedInterestIds = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectedInterestIdsSorted = useMemo(
    () => [...selectedInterestIds].sort(),
    [selectedInterestIds],
  );
  const hasSelection = selectedInterestIdsSorted.length > 0;
  const highlightNodeIds = useMemo(() => {
    const set = new Set(selectedInterestIds);
    if (activeNodeId) set.add(activeNodeId);
    if (connectFromId) set.add(connectFromId);
    return set;
  }, [activeNodeId, connectFromId, selectedInterestIds]);

  useEffect(() => {
    if (!shouldFitView || hasFittedRef.current || nodes.length === 0) return;
    const timeout = setTimeout(() => {
      reactFlow.fitView({ padding: 0.2, duration: 300 });
      hasFittedRef.current = true;
    }, 50);
    return () => clearTimeout(timeout);
  }, [nodes.length, reactFlow, shouldFitView]);

  useEffect(() => {
    const merged = mergeEdges(autoEdges, manualEdgesState).map((edge) =>
      edge.id === selectedEdgeId ? { ...edge, selected: true } : edge,
    );
    setEdges(merged);
  }, [autoEdges, manualEdgesState, selectedEdgeId, setEdges]);

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => {
        const isManual = edge.data?.kind === "manual";
        const isConnected =
          highlightNodeIds.has(edge.source) || highlightNodeIds.has(edge.target);
        const isEdgeSelected = edge.id === selectedEdgeId;
        const hasHighlight = highlightNodeIds.size > 0;
        const baseStyle = isManual ? MANUAL_EDGE_STYLE : AUTO_EDGE_STYLE;
        const emphasized = isConnected || isEdgeSelected;
        const strokeWidth = emphasized ? (isManual ? 2.4 : 2) : baseStyle.strokeWidth;
        const opacity = emphasized ? 0.95 : hasHighlight ? 0.35 : baseStyle.opacity;
        const stroke = emphasized
          ? `hsl(var(--primary) / ${isManual ? 0.95 : 0.75})`
          : baseStyle.stroke;

        return {
          ...edge,
          type: "smoothstep",
          animated: false,
          style: {
            ...baseStyle,
            strokeWidth,
            opacity,
            stroke,
          },
        };
      }),
    [edges, highlightNodeIds, selectedEdgeId],
  );

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

  const handleNodesChange: OnNodesChange<InterestFlowNode> = useCallback(
    (changes) => {
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
    },
    [onEdgesChange],
  );

  const handleSelectionChange = useCallback((params: { edges?: Edge[] }) => {
    const selected = params.edges?.[0];
    setSelectedEdgeId(selected?.id ?? null);
  }, []);

  const handlePaneMouseLeave = useCallback(() => {
    setActiveNodeId(null);
  }, []);

  const handleNodeMouseEnter = useCallback((_: ReactMouseEvent, node: InterestFlowNode) => {
    setActiveNodeId(node.id);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setActiveNodeId(null);
  }, []);

  const selectSingle = useCallback((id: string) => setSelectedIds(new Set([id])), []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const displayedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: selectedIds.has(node.id),
        data: {
          ...node.data,
          isActive: activeNodeId === node.id,
          isSelected: selectedIds.has(node.id),
          isMultiSelected: selectedIds.size > 1 && selectedIds.has(node.id),
          isDragging: draggingNodeId === node.id,
        },
      })),
    [activeNodeId, draggingNodeId, nodes, selectedIds],
  );

  const persistPosition = useCallback(
    async (interestId: string, position: { x: number; y: number }) => {
      setPendingNodeId(interestId);
      setIsSaving(true);
      setSaveError(null);

      const result = await saveMapPosition({
        interestId,
        x: position.x,
        y: position.y,
      });

      if (result.error) {
        setSaveError(result.error);
        setToast({ message: "Не удалось сохранить позицию", variant: "error" });
      } else {
        setLastSavedPositions((prev) => {
          const next = new Map(prev);
          next.set(interestId, { x: position.x, y: position.y });
          return next;
        });
        const now = Date.now();
        if (now - lastSuccessAtRef.current > 800) {
          setToast({ message: "Сохранено", variant: "success" });
          lastSuccessAtRef.current = now;
        }
      }

      setIsSaving(false);
      setPendingNodeId(null);
    },
    [],
  );

  const handleNodeDragStop: OnNodeDrag<InterestFlowNode> = useCallback(
    (_, node) => {
      setDraggingNodeId(null);
      if (!node?.id || !node.position) return;

      const previous = lastSavedPositions.get(node.id);
      if (!hasPositionChanged(previous, node.position)) return;

      void persistPosition(node.id, node.position);
      setDraggingNodeId(null);
    },
    [lastSavedPositions, persistPosition],
  );
  const handleNodeDragStart: OnNodeDrag<InterestFlowNode> = useCallback((_, node) => {
    if (!node?.id) return;
    setDraggingNodeId(node.id);
  }, []);

  const nodeTitleMap = useMemo(
    () => new Map(interests.map((interest) => [interest.id, interest.title])),
    [interests],
  );

  const manualEdgePairs = useMemo(
    () => new Set(manualEdgesState.map((edge) => edgePairKey(edge.sourceId, edge.targetId))),
    [manualEdgesState],
  );

  const handleConnectToggle = useCallback(() => {
    setConnectMode((prev) => {
      const next = !prev;
      if (!next) {
        setConnectFromId(null);
        setSelectionHint(null);
      } else {
        setSelectionMode(false);
        setSelectionHint("Режим выбора недоступен, пока включено «Соединить».");
      }
      return next;
    });
    setEdgeError(null);
  }, []);

  const createManualEdge = useCallback(
    async (sourceId: string, targetId: string) => {
      const [normalizedSource, normalizedTarget] = normalizeEdgePair(sourceId, targetId);
      const pairKey = edgePairKey(normalizedSource, normalizedTarget);

      if (manualEdgePairs.has(pairKey)) {
        setEdgeError("Такая связь уже есть.");
        setConnectFromId(null);
        setEdgePendingKey(null);
        return;
      }

      setEdgeError(null);
      setEdgePendingKey(pairKey);
      setManualEdgesState((prev) => [...prev, { sourceId: normalizedSource, targetId: normalizedTarget }]);

      const { error } = await createManualEdgeAction({
        sourceId: normalizedSource,
        targetId: normalizedTarget,
      });

      if (error) {
        setEdgeError(error);
        setManualEdgesState((prev) =>
          prev.filter((edge) => edgePairKey(edge.sourceId, edge.targetId) !== pairKey),
        );
      } else {
        setToast({ message: "Связь сохранена", variant: "success" });
      }

      setEdgePendingKey(null);
      setConnectFromId(null);
    },
    [manualEdgePairs],
  );

  const handleSelectionModeToggle = useCallback(() => {
    if (connectMode) {
      setSelectionHint("Сначала отключите «Соединить», чтобы включить выбор.");
      return;
    }
    setSelectionHint(null);
    setSelectionMode((prev) => !prev);
  }, [connectMode]);

  const handleNodeClick = useCallback(
    (event: ReactMouseEvent, node: InterestFlowNode) => {
      if (!node?.id) return;

      if (connectMode) {
        if (edgePendingKey) return;

        setEdgeError(null);

        if (!connectFromId) {
          setConnectFromId(node.id);
          return;
        }

        if (connectFromId === node.id) {
          setEdgeError("Выберите другой узел, чтобы создать связь.");
          return;
        }

        void createManualEdge(connectFromId, node.id);
        return;
      }

      const hasToggleModifier = event.ctrlKey || event.metaKey || event.shiftKey;

      if (selectionMode || hasToggleModifier) {
        toggleSelect(node.id);
      } else {
        selectSingle(node.id);
      }
    },
    [
      connectFromId,
      connectMode,
      createManualEdge,
      edgePendingKey,
      selectSingle,
      selectionMode,
      toggleSelect,
    ],
  );

  const handlePaneClick = useCallback(() => {
    if (connectMode) return;
    clearSelection();
    setSelectedEdgeId(null);
    setActiveNodeId(null);
  }, [clearSelection, connectMode]);

  const handlePickSelected = useCallback(() => {
    if (selectedInterestIdsSorted.length === 0) return;

    const params = new URLSearchParams();
    params.set("interests", selectedInterestIdsSorted.join(","));
    router.push(`/content?${params.toString()}`);
  }, [router, selectedInterestIdsSorted]);

  const handlePickAll = useCallback(() => {
    router.push("/content?mode=all");
  }, [router]);

  const handleDeleteManualEdge = useCallback(async () => {
    if (!selectedEdgeId) return;

    const targetEdge = edges.find((edge) => edge.id === selectedEdgeId);
    if (!targetEdge || targetEdge.data?.kind !== "manual") return;

    const [sourceId, targetId] = normalizeEdgePair(targetEdge.source, targetEdge.target);
    const pairKey = edgePairKey(sourceId, targetId);

    setEdgeError(null);
    setEdgePendingKey(pairKey);
    setSelectedEdgeId(null);
    setManualEdgesState((prev) =>
      prev.filter((edge) => edgePairKey(edge.sourceId, edge.targetId) !== pairKey),
    );

    const { error } = await deleteManualEdgeAction({ sourceId, targetId });

    if (error) {
      setEdgeError(error);
      setManualEdgesState((prev) => [...prev, { sourceId, targetId }]);
    } else {
      setToast({ message: "Связь удалена", variant: "success" });
    }

    setEdgePendingKey(null);
  }, [edges, selectedEdgeId]);

  const handleResetLayout = useCallback(async () => {
    setResetDialogOpen(false);
    setIsResettingLayout(true);
    setSelectionHint(null);
    setConnectFromId(null);
    setConnectMode(false);
    setSelectionMode(false);
    setActiveNodeId(null);
    setDraggingNodeId(null);
    setSelectedIds(new Set());

    const nextLayout = computeClusterLayout(interests);
    const payload = Array.from(nextLayout.entries()).map(([interestId, position]) => ({
      interestId,
      x: position.x,
      y: position.y,
    }));

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const nextPosition = nextLayout.get(node.id);
        if (!nextPosition) return node;
        return {
          ...node,
          position: nextPosition,
        };
      }),
    );
    setLastSavedPositions(new Map(nextLayout));
    hasFittedRef.current = false;

    try {
      if (payload.length > 0) {
        await saveMapPositions({ positions: payload });
      }
      setToast({ message: "Раскладка сброшена", variant: "success" });
      setTimeout(() => {
        reactFlow.fitView({ padding: 0.2, duration: 400 });
      }, 80);
    } catch {
      setToast({ message: "Не удалось сбросить раскладку", variant: "error" });
    } finally {
      setIsResettingLayout(false);
    }
  }, [interests, reactFlow, setNodes]);

  const handleZoomIn = useCallback(() => {
    const current = reactFlow.getZoom();
    reactFlow.zoomTo(current + 0.2, { duration: 200 });
  }, [reactFlow]);

  const handleZoomOut = useCallback(() => {
    const current = reactFlow.getZoom();
    reactFlow.zoomTo(Math.max(0.4, current - 0.2), { duration: 200 });
  }, [reactFlow]);

  const handleFitView = useCallback(() => {
    reactFlow.fitView({ padding: 0.22, duration: 320 });
  }, [reactFlow]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!selectedEdgeId) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      void handleDeleteManualEdge();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleDeleteManualEdge, selectedEdgeId]);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 1800);
  }, [toast]);

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId),
    [edges, selectedEdgeId],
  );

  const canDeleteSelected = selectedEdge?.data?.kind === "manual";

  const connectHint = connectMode
    ? connectFromId
      ? `Выбрано: «${nodeTitleMap.get(connectFromId) ?? "интерес"}». Выберите второй интерес.`
      : "Соединить: выберите 2 интереса, чтобы создать связь."
    : "Нажмите «Соединить», чтобы добавить ручные связи.";

  const selectionStatus = selectionMode
    ? "Режим выбора включен: тапайте или кликайте, чтобы отметить несколько узлов."
    : "Клик — выбрать. Shift/Ctrl — мульти. На мобильном включите «Выбор».";
  const selectionHelperText = hasSelection
    ? "Используем только отмеченные узлы."
    : "Выберите хотя бы один интерес.";

  const positionStatus =
    pendingNodeId && isSaving
      ? "Сохраняем позицию..."
      : newlyPositionedIds.length > 0 && isSaving
        ? "Формируем авто-раскладку..."
        : "Перетаскивайте узлы — раскладка сохранится автоматически";

  const edgeStatus = edgePendingKey ? "Сохраняем связь..." : positionStatus;

  if (interests.length === 0) {
    return <EmptyMapState />;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(124,58,237,0.12),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_70%,rgba(79,70,229,0.08),transparent_50%)]" />
      <div className="h-[70vh] min-h-[480px] w-full">
        <ReactFlow
          nodes={displayedNodes}
          edges={styledEdges}
          minZoom={0.4}
          maxZoom={1.6}
          nodeTypes={nodeTypes}
          panOnScroll
          selectionOnDrag={selectionMode}
          panOnDrag={!selectionMode}
          deleteKeyCode={null}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={handleNodeClick}
          onSelectionChange={handleSelectionChange}
          onPaneClick={handlePaneClick}
          onPaneMouseLeave={handlePaneMouseLeave}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          className={cn("bg-gradient-to-b from-background via-background/92 to-background/80")}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.4}
            color="rgba(255,255,255,0.06)"
          />
          <MiniMap
            className="!bg-card/85 !text-muted-foreground"
            nodeColor="rgba(124, 58, 237, 0.82)"
            nodeBorderRadius={14}
            pannable
            zoomable
            position="bottom-right"
          />

            <Panel
              position="top-right"
              className="max-w-[min(380px,calc(100vw-24px))] rounded-2xl border border-border/80 bg-background/95 px-4 py-3 shadow-xl shadow-black/15 backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                    Подбор контента
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Отметьте интересы или используйте все сразу — откроется /content.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                  {hasSelection ? `Выбрано ${selectedInterestIdsSorted.length}` : "Нет выбора"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  className="w-full justify-center"
                  disabled={!hasSelection}
                  onClick={handlePickSelected}
                >
                  {hasSelection
                    ? `Подобрать по выбранным (${selectedInterestIdsSorted.length})`
                    : "Подобрать по выбранным"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  className="w-full justify-center border border-border/60"
                  onClick={handlePickAll}
                >
                  Подобрать по всем
                </Button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{selectionHelperText}</p>
            </Panel>

            <Panel
              position="top-left"
              className="max-w-[min(420px,calc(100vw-24px))] rounded-2xl border border-border/80 bg-background/95 px-4 py-3 text-xs shadow-xl shadow-black/15 backdrop-blur"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={connectMode ? "primary" : "soft"}
                  className={cn(
                    "h-9 rounded-full px-3",
                    edgePendingKey && "cursor-not-allowed opacity-60",
                  )}
                  disabled={Boolean(edgePendingKey)}
                  onClick={handleConnectToggle}
                >
                  <MousePointer2 className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Соединить</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  className={cn(
                    "h-9 rounded-full px-3",
                    (!canDeleteSelected || edgePendingKey) && "cursor-not-allowed opacity-60",
                    canDeleteSelected && !edgePendingKey && "text-destructive",
                  )}
                  disabled={!canDeleteSelected || Boolean(edgePendingKey)}
                  onClick={() => void handleDeleteManualEdge()}
                >
                  <RefreshCcw className="h-4 w-4 rotate-45" aria-hidden />
                  <span className="hidden sm:inline">Удалить связь</span>
                </Button>
                <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-[11px] shadow-inner shadow-black/5">
                  <span className="font-semibold text-foreground">Выбрано: {selectedInterestIds.length}</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={selectedInterestIds.length === 0}
                    className={cn(
                      "rounded-full px-2 py-1 font-semibold transition",
                      selectedInterestIds.length === 0
                        ? "cursor-not-allowed bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary hover:bg-primary/20",
                    )}
                  >
                    Сбросить
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-1 text-[11px] leading-relaxed text-muted-foreground">
                <p className="text-foreground/80">{connectHint}</p>
                <p className="text-foreground/80">{selectionStatus}</p>
                <p>{edgeStatus}</p>
                {edgeError ? <p className="text-destructive">{edgeError}</p> : null}
                {selectionHint ? <p className="text-primary">{selectionHint}</p> : null}
              </div>
              <div className="mt-3 grid gap-1 rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <CircleHelp className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <span>Быстрые подсказки</span>
                </div>
                <p>Клик — выбрать. Shift/Ctrl — мульти.</p>
                <p>Перетяни узел — позиция сохранится. Фит-вью внизу слева.</p>
                <p>На мобильном включи «Режим выбора», чтобы отметить несколько.</p>
              </div>
            </Panel>

          <Panel
            position="bottom-left"
            className="rounded-full border border-border/80 bg-background/95 px-2 py-1 shadow-lg shadow-black/10 backdrop-blur"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="soft"
                className="h-9 rounded-full px-3"
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Приблизить</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="soft"
                className="h-9 rounded-full px-3"
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Отдалить</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="soft"
                className="h-9 rounded-full px-3"
                onClick={handleFitView}
              >
                <Maximize2 className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Подогнать</span>
              </Button>
              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="soft"
                    className="h-9 rounded-full px-3 text-destructive"
                    disabled={isResettingLayout}
                  >
                    <RefreshCcw className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Сбросить</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Сбросить раскладку?</DialogTitle>
                    <DialogDescription>
                      Мы вернём узлы в аккуратную авто-раскладку и сохраним новое расположение. Ручные связи останутся.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="soft" size="sm">
                        Отмена
                      </Button>
                    </DialogClose>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => void handleResetLayout()}
                      disabled={isResettingLayout}
                    >
                      {isResettingLayout ? "Сбрасываем..." : "Сбросить"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                type="button"
                size="sm"
                variant={selectionMode ? "primary" : "soft"}
                className="h-9 rounded-full px-3"
                onClick={handleSelectionModeToggle}
              >
                <Hand className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Режим выбора</span>
              </Button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
      {saveError ? (
        <div className="absolute inset-x-0 bottom-0 bg-destructive/90 px-4 py-2 text-center text-sm font-semibold text-destructive-foreground">
          Не удалось сохранить позицию: {saveError}
        </div>
      ) : null}
      {toast ? (
        <div
          className={cn(
            "pointer-events-none absolute right-3 top-3 min-w-[160px] rounded-full px-3 py-2 text-sm shadow-lg shadow-black/10 ring-1",
            toast.variant === "success"
              ? "bg-emerald-500/90 text-emerald-50 ring-emerald-500/60"
              : "bg-destructive text-destructive-foreground ring-destructive/80",
          )}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
};

export const MapCanvas = ({ interests, manualEdges }: MapCanvasProps) => {
  const layoutKeyBase = interests
    .map((interest) => `${interest.id}:${interest.position ? "1" : "0"}`)
    .join("|");
  const manualEdgesKey = manualEdges
    .map((edge) => edgePairKey(edge.sourceId, edge.targetId))
    .sort()
    .join("|");
  const layoutKey = `${layoutKeyBase}|${manualEdgesKey}`;

  if (interests.length === 0) {
    return <EmptyMapState />;
  }

  return (
    <ReactFlowProvider>
      <MapCanvasInner key={layoutKey} interests={interests} manualEdges={manualEdges} />
    </ReactFlowProvider>
  );
};
