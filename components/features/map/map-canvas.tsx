"use client";

import "@xyflow/react/dist/style.css";

import { addUserInterestAction } from "@/app/actions/add-user-interest";
import { createManualEdgeAction } from "@/app/actions/create-manual-edge";
import { deleteManualEdgeAction } from "@/app/actions/delete-manual-edge";
import { saveMapPosition } from "@/app/actions/save-map-position";
import { saveMapPositions } from "@/app/actions/save-map-positions";
import { ClusterNode } from "@/components/features/map/cluster-node";
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
import {
  CLUSTER_ORDER,
  clusterLabel,
  computeClusterLayout,
  normalizeClusterKey,
  placeMissingNodesNearClusters,
} from "@/lib/map/auto-layout";
import type { MapInterestNode, MapManualEdge } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import {
  CircleHelp,
  Hand,
  Maximize2,
  MousePointer2,
  PanelLeft,
  Plus,
  RefreshCcw,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type OnEdgesChange,
  type OnMove,
  type Node,
  type OnNodesChange,
  type OnNodeDrag,
  type Viewport,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

type InterestNodeData = {
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

type ClusterNodeData = {
  kind: "cluster";
  clusterKey: string;
  title: string;
  count: number;
  radius?: number;
};

type MapNodeData = InterestNodeData | ClusterNodeData;

type MapCanvasProps = {
  interests: MapInterestNode[];
  manualEdges: MapManualEdge[];
};

type MapFlowNode = Node<MapNodeData>;
type InterestFlowNode = Node<InterestNodeData>;
type RecommendationItem = {
  id: string;
  title: string;
  cluster: string | null;
  clusterLabel: string;
  score: number;
};

// Quick map diagnosis:
// - Nodes are rendered via components/features/map/interest-node.tsx (nodeTypes).
// - Panel controls live inside this map-canvas component (ReactFlow Panel sections).
// - Connect mode logic is handled in handleConnectToggle/handleNodeClick with manualEdgesState.

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
const nodeTypes = { interest: InterestNode, cluster: ClusterNode };

const NODE_WIDTH = 190;
const NODE_HEIGHT = 68;
const CLUSTER_PADDING_X = 140;
const CLUSTER_PADDING_Y = 120;
const ENABLE_CLUSTER_NODES = true;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;

const isInterestNode = (node: MapFlowNode): node is InterestFlowNode =>
  node.data.kind === "interest";

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

const EDGE_TRANSITION =
  "stroke 180ms ease, stroke-width 180ms ease, opacity 180ms ease, filter 180ms ease";

const AUTO_EDGE_STYLE = {
  stroke: "hsl(var(--muted-foreground) / 0.35)",
  strokeWidth: 1.4,
  opacity: 0.75,
  transition: EDGE_TRANSITION,
  strokeLinecap: "round" as const,
  filter: "drop-shadow(0 0 6px hsl(var(--muted-foreground) / 0.25))",
};

const MANUAL_EDGE_STYLE = {
  stroke: "hsl(var(--primary) / 0.9)",
  strokeWidth: 2.2,
  opacity: 0.9,
  transition: EDGE_TRANSITION,
  strokeLinecap: "round" as const,
  filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.35))",
};

const SELECTION_EDGE_STYLE = {
  stroke: "hsl(var(--primary) / 0.85)",
  strokeWidth: 2.6,
  opacity: 0.95,
  transition: EDGE_TRANSITION,
  strokeLinecap: "round" as const,
  filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.45))",
};

const PREVIEW_EDGE_STYLE = {
  stroke: "hsl(var(--primary) / 0.65)",
  strokeWidth: 2.2,
  opacity: 0.85,
  strokeDasharray: "6 6",
  transition: EDGE_TRANSITION,
  strokeLinecap: "round" as const,
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
  animated: true,
  style: MANUAL_EDGE_STYLE,
  data: { kind: "manual" },
});

const buildAutoEdges = (nodes: MapInterestNode[]): Edge[] => {
  const grouped = new Map<string, MapInterestNode[]>();

  nodes.forEach((node) => {
    const key = normalizeClusterKey(node.cluster);
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

    const chainLimit = Math.min(8, sorted.length);
    for (let i = 0; i < chainLimit - 1; i += 1) {
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

    if (sorted.length > 6) {
      const hub = sorted[0]!;
      const spokes = sorted.slice(1, 6);
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

  const clusterAnchors = new Map<string, MapInterestNode>();
  grouped.forEach((clusterNodes, cluster) => {
    const sorted = [...clusterNodes].sort(
      (a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
    );
    if (sorted.length > 0) {
      clusterAnchors.set(cluster, sorted[0]!);
    }
  });

  const crossLinks: Array<[string, string]> = [
    ["learning", "business"],
    ["self", "learning"],
    ["health", "self"],
    ["creativity", "business"],
    ["finance", "business"],
    ["communication", "business"],
  ];

  crossLinks.forEach(([sourceCluster, targetCluster]) => {
    const source = clusterAnchors.get(sourceCluster);
    const target = clusterAnchors.get(targetCluster);
    if (!source || !target || source.id === target.id) return;

    const [sourceId, targetId] = normalizeEdgePair(source.id, target.id);
    edges.push({
      id: autoEdgeId("cross", sourceId, targetId),
      source: sourceId,
      target: targetId,
      type: "smoothstep",
      animated: false,
      style: AUTO_EDGE_STYLE,
      data: { kind: "auto", cluster: "cross" },
    });
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

  const flowNodes: MapFlowNode[] = interests.map((interest) => ({
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

const MapCanvasInner = ({ interests: initialInterests, manualEdges }: MapCanvasProps) => {
  const { nodes: initialNodes, positionMap, newlyPositionedIds, shouldFitView } = useMemo(
    () => buildLayout(initialInterests),
    [initialInterests],
  );
  const initialManualEdges = useMemo<ManualEdgeState[]>(() => toManualEdgeState(manualEdges), [manualEdges]);
  const [interestNodes, setInterestNodes] = useState<MapInterestNode[]>(initialInterests);
  const autoEdges = useMemo(() => buildAutoEdges(interestNodes), [interestNodes]);
  const initialEdges = useMemo(
    () => mergeEdges(autoEdges, initialManualEdges),
    [autoEdges, initialManualEdges],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<MapFlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [manualEdgesState, setManualEdgesState] = useState<ManualEdgeState[]>(initialManualEdges);
  const [lastSavedPositions, setLastSavedPositions] = useState<
    Map<string, { x: number; y: number }>
  >(() => new Map(initialNodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }])));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [addPendingId, setAddPendingId] = useState<string | null>(null);
  const [camera, setCamera] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null,
  );
  const toastTimeoutRef = useRef<number | null>(null);
  const hasLoggedRef = useRef(false);
  const lastSuccessAtRef = useRef(0);
  const [connectMode, setConnectMode] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeError, setEdgeError] = useState<string | null>(null);
  const [edgePendingKey, setEdgePendingKey] = useState<string | null>(null);
  const reactFlow = useReactFlow();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
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
  const presentInterestIds = useMemo(
    () => interestNodes.map((interest) => interest.id),
    [interestNodes],
  );

  useEffect(() => {
    setInterestNodes(initialInterests);
  }, [initialInterests]);

  useEffect(() => {
    if (!shouldFitView || hasFittedRef.current || nodes.length === 0) return;
    const timeout = setTimeout(() => {
      reactFlow.fitView({ padding: 0.2, duration: 300 });
      hasFittedRef.current = true;
    }, 50);
    return () => clearTimeout(timeout);
  }, [nodes.length, reactFlow, shouldFitView]);

  useEffect(() => {
    setCamera(reactFlow.getViewport());
  }, [reactFlow]);

  useEffect(() => {
    const merged = mergeEdges(autoEdges, manualEdgesState).map((edge) =>
      edge.id === selectedEdgeId ? { ...edge, selected: true } : edge,
    );
    setEdges(merged);
  }, [autoEdges, manualEdgesState, selectedEdgeId, setEdges]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("mapPanelOpen");
    if (stored === "1") {
      setIsPanelOpen(true);
    } else if (stored === "0") {
      setIsPanelOpen(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("mapPanelOpen", isPanelOpen ? "1" : "0");
  }, [isPanelOpen]);

  useEffect(() => {
    const controller = new AbortController();
    let isCancelled = false;

    const loadRecommendations = async () => {
      setIsLoadingRecommendations(true);
      setRecommendationsError(null);
      try {
        const params = new URLSearchParams();
        if (selectedInterestIdsSorted.length > 0) {
          params.set("ids", selectedInterestIdsSorted.join(","));
        }
        if (presentInterestIds.length > 0) {
          params.set("present", presentInterestIds.join(","));
        }

        const query = params.toString();
        const response = await fetch(
          query ? `/api/map/recommendations?${query}` : "/api/map/recommendations",
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as {
          recommendations?: RecommendationItem[];
          error?: string;
        };

        if (isCancelled) return;

        if (!response.ok || payload.error) {
          throw new Error(payload.error ?? "Не удалось загрузить рекомендации");
        }

        setRecommendations(payload.recommendations ?? []);
      } catch (error) {
        if (isCancelled || controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "Не удалось загрузить рекомендации";
        setRecommendationsError(message);
      } finally {
        if (!isCancelled) {
          setIsLoadingRecommendations(false);
        }
      }
    };

    void loadRecommendations();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [presentInterestIds, selectedInterestIdsSorted]);

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => {
        const isManual = edge.data?.kind === "manual";
        const isSelection = edge.data?.kind === "selection";
        const isConnected =
          highlightNodeIds.has(edge.source) || highlightNodeIds.has(edge.target);
        const isEdgeSelected = edge.id === selectedEdgeId;
        const hasHighlight = highlightNodeIds.size > 0;
        const baseStyle = isSelection
          ? SELECTION_EDGE_STYLE
          : isManual
            ? MANUAL_EDGE_STYLE
            : AUTO_EDGE_STYLE;
        const emphasized = isSelection || isConnected || isEdgeSelected;
        const strokeWidth = emphasized ? (isManual ? 2.4 : baseStyle.strokeWidth) : baseStyle.strokeWidth;
        const opacity = emphasized ? 0.95 : hasHighlight ? 0.35 : baseStyle.opacity;
        const stroke = emphasized
          ? `hsl(var(--primary) / ${isManual || isSelection ? 0.95 : 0.75})`
          : baseStyle.stroke;
        const filter =
          isManual || isSelection
            ? "drop-shadow(0 0 12px hsl(var(--primary) / 0.45))"
            : baseStyle.filter;

        return {
          ...edge,
          type: "smoothstep",
          animated: isManual || isSelection,
          style: {
            ...baseStyle,
            strokeWidth,
            opacity,
            stroke,
            filter,
          },
        };
      }),
    [edges, highlightNodeIds, selectedEdgeId],
  );

  const selectionEdges = useMemo(() => {
    if (!selectionMode || selectedInterestIdsSorted.length < 2) return [];
    const edgesList: Edge[] = [];
    for (let i = 0; i < selectedInterestIdsSorted.length - 1; i += 1) {
      const source = selectedInterestIdsSorted[i]!;
      const target = selectedInterestIdsSorted[i + 1]!;
      const [sourceId, targetId] = normalizeEdgePair(source, target);
      edgesList.push({
        id: `s:${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: "smoothstep",
        animated: true,
        selectable: false,
        focusable: false,
        style: SELECTION_EDGE_STYLE,
        data: { kind: "selection" },
      });
    }
    return edgesList;
  }, [selectedInterestIdsSorted, selectionMode]);

  const previewEdge = useMemo(() => {
    if (!connectMode || !connectFromId) return null;
    if (!activeNodeId || activeNodeId === connectFromId) return null;

    return {
      id: `preview-${connectFromId}-${activeNodeId}`,
      source: connectFromId,
      target: activeNodeId,
      type: "smoothstep",
      animated: true,
      selectable: false,
      focusable: false,
      style: PREVIEW_EDGE_STYLE,
      data: { kind: "preview" },
    } satisfies Edge;
  }, [activeNodeId, connectFromId, connectMode]);

  const renderedEdges = useMemo(() => {
    const base = [...styledEdges, ...selectionEdges];
    return previewEdge ? [...base, previewEdge] : base;
  }, [previewEdge, selectionEdges, styledEdges]);

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

  const handleNodesChange: OnNodesChange<MapFlowNode> = useCallback(
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

  const handleNodeMouseEnter = useCallback((_: ReactMouseEvent, node: MapFlowNode) => {
    if (!isInterestNode(node)) return;
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

  const displayedNodes = useMemo<MapFlowNode[]>(
    () =>
      nodes.map((node) => {
        if (!isInterestNode(node)) {
          return {
            ...node,
            selected: false,
            style: { zIndex: 0 },
          };
        }

        return {
          ...node,
          selected: selectedIds.has(node.id) || connectFromId === node.id,
          style: { zIndex: 2 },
          data: {
            ...node.data,
            isActive: activeNodeId === node.id || connectFromId === node.id,
            isSelected: selectedIds.has(node.id) || connectFromId === node.id,
            isMultiSelected: selectedIds.size > 1 && selectedIds.has(node.id),
            isDragging: draggingNodeId === node.id,
            isConnectSource: connectFromId === node.id,
            isConnectTarget:
              connectMode && Boolean(connectFromId) && node.id === activeNodeId && node.id !== connectFromId,
            isPreviewTarget:
              connectMode && Boolean(connectFromId) && node.id === activeNodeId && node.id !== connectFromId,
          },
        };
      }),
    [activeNodeId, connectFromId, connectMode, draggingNodeId, nodes, selectedIds],
  );

  const clusterNodes = useMemo<MapFlowNode[]>(() => {
    if (!ENABLE_CLUSTER_NODES) return [];
    const clusters = new Map<string, InterestFlowNode[]>();
    nodes.forEach((node) => {
      if (!isInterestNode(node)) return;
      const key = normalizeClusterKey(node.data.cluster);
      const list = clusters.get(key) ?? [];
      list.push(node);
      clusters.set(key, list);
    });

    const orderIndex = (key: string) => {
      const index = CLUSTER_ORDER.indexOf(key as (typeof CLUSTER_ORDER)[number]);
      return index === -1 ? CLUSTER_ORDER.length : index;
    };

    return Array.from(clusters.entries())
      .sort((a, b) => orderIndex(a[0]) - orderIndex(b[0]) || a[0].localeCompare(b[0]))
      .map(([key, clusterNodesList]) => {
        const positions = clusterNodesList.map((node) => node.position);
        const minX = Math.min(...positions.map((pos) => pos.x));
        const minY = Math.min(...positions.map((pos) => pos.y));
        const maxX = Math.max(...positions.map((pos) => pos.x));
        const maxY = Math.max(...positions.map((pos) => pos.y));

        const width = maxX - minX + NODE_WIDTH + CLUSTER_PADDING_X * 2;
        const height = maxY - minY + NODE_HEIGHT + CLUSTER_PADDING_Y * 2;

        return {
          id: `cluster:${key}`,
          type: "cluster",
          position: {
            x: minX - CLUSTER_PADDING_X,
            y: minY - CLUSTER_PADDING_Y,
          },
          data: {
            kind: "cluster",
            clusterKey: key,
            title: clusterLabel(key),
            count: clusterNodesList.length,
            radius: Math.max(width, height) * 0.5,
          },
          draggable: false,
          selectable: false,
          connectable: false,
          focusable: false,
          style: { zIndex: 0, width, height },
        } satisfies MapFlowNode;
      });
  }, [nodes]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (hasLoggedRef.current) return;
    if (displayedNodes.length === 0) return;

    hasLoggedRef.current = true;
    console.info("[MapCanvas] nodes:", {
      interests: displayedNodes.filter(isInterestNode).length,
      clusters: clusterNodes.length,
      edges: edges.length,
    });
  }, [clusterNodes.length, displayedNodes, edges.length]);

  const getCanvasCenter = useCallback(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const bounds = canvasRef.current?.getBoundingClientRect();
    const centerPoint = bounds
      ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    try {
      return reactFlow.screenToFlowPosition(centerPoint);
    } catch {
      return { x: 0, y: 0 };
    }
  }, [reactFlow]);

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

  const handleNodeDragStop: OnNodeDrag<MapFlowNode> = useCallback(
    (_, node) => {
      if (!isInterestNode(node)) return;
      setDraggingNodeId(null);
      if (!node?.id || !node.position) return;

      const previous = lastSavedPositions.get(node.id);
      if (!hasPositionChanged(previous, node.position)) return;

      void persistPosition(node.id, node.position);
      setDraggingNodeId(null);
    },
    [lastSavedPositions, persistPosition],
  );
  const handleNodeDragStart: OnNodeDrag<MapFlowNode> = useCallback((_, node) => {
    if (!isInterestNode(node) || !node?.id) return;
    setDraggingNodeId(node.id);
  }, []);

  const handleAddInterestNode = useCallback(
    async (interest: RecommendationItem) => {
      if (addPendingId) return;
      if (interestNodes.some((item) => item.id === interest.id)) {
        setToast({ message: "Узел уже добавлен", variant: "success" });
        return;
      }

      setAddPendingId(interest.id);
      const jitter = () => (Math.random() - 0.5) * 140;
      const basePosition = getCanvasCenter();
      const nextPosition = { x: basePosition.x + jitter(), y: basePosition.y + jitter() };

      const nextNode: MapInterestNode = {
        id: interest.id,
        title: interest.title,
        cluster: interest.cluster,
        position: nextPosition,
      };

      setInterestNodes((prev) => [...prev, nextNode]);
      setNodes((prev) => [
        ...prev,
        {
          id: interest.id,
          type: "interest",
          position: nextPosition,
          data: {
            kind: "interest",
            title: interest.title,
            cluster: interest.cluster,
            clusterLabel: interest.clusterLabel,
          },
        },
      ]);
      setLastSavedPositions((prev) => {
        const next = new Map(prev);
        next.set(interest.id, nextPosition);
        return next;
      });
      setRecommendations((prev) => prev.filter((item) => item.id !== interest.id));
      setRecommendationsError(null);

      const { error } = await addUserInterestAction(interest.id);

      if (error) {
        setRecommendationsError(error);
        setInterestNodes((prev) => prev.filter((item) => item.id !== interest.id));
        setNodes((prev) => prev.filter((node) => node.id !== interest.id));
        setLastSavedPositions((prev) => {
          const next = new Map(prev);
          next.delete(interest.id);
          return next;
        });
        setRecommendations((prev) => [interest, ...prev]);
        setAddPendingId(null);
        return;
      }

      const { error: positionError } = await saveMapPosition({
        interestId: interest.id,
        x: nextPosition.x,
        y: nextPosition.y,
      });

      if (positionError) {
        setRecommendationsError(positionError);
      } else {
        setToast({ message: "Узел добавлен", variant: "success" });
      }

      setAddPendingId(null);
    },
    [addPendingId, getCanvasCenter, interestNodes],
  );

  const nodeTitleMap = useMemo(
    () => new Map(interestNodes.map((interest) => [interest.id, interest.title])),
    [interestNodes],
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
    (event: ReactMouseEvent, node: MapFlowNode) => {
      if (!node?.id || !isInterestNode(node)) return;

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
    if (connectMode) {
      setConnectFromId(null);
      setActiveNodeId(null);
      return;
    }
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

    const nextLayout = computeClusterLayout(interestNodes);
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
  }, [interestNodes, reactFlow, setNodes]);

  const handleZoomIn = useCallback(() => {
    const nextZoom = Math.min(MAX_ZOOM, camera.zoom + 0.2);
    reactFlow.zoomTo(nextZoom, { duration: 200 });
  }, [camera.zoom, reactFlow]);

  const handleZoomOut = useCallback(() => {
    const nextZoom = Math.max(MIN_ZOOM, camera.zoom - 0.2);
    reactFlow.zoomTo(nextZoom, { duration: 200 });
  }, [camera.zoom, reactFlow]);

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

  const selectionStatus = selectionMode
    ? "Режим выбора включен: тапайте или кликайте, чтобы отметить несколько узлов."
    : "Клик — выбрать. Shift/Ctrl — мульти. На мобильном включите «Режим выбора».";
  const selectionHelperText = hasSelection
    ? "Используем только отмеченные узлы."
    : "Выберите хотя бы один интерес.";

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId),
    [edges, selectedEdgeId],
  );

  const canDeleteSelected = selectedEdge?.data?.kind === "manual";

  const connectHint = connectMode
    ? connectFromId
      ? `Выбрано: «${nodeTitleMap.get(connectFromId) ?? "интерес"}». Наведите или нажмите второй узел.`
      : "Соединить: выберите 2 интереса, наведите — увидите предварительную линию."
    : "Нажмите «Соединить», чтобы добавить ручные связи и подсветку путей.";

  const positionStatus =
    pendingNodeId && isSaving
      ? "Сохраняем позицию..."
      : newlyPositionedIds.length > 0 && isSaving
        ? "Формируем авто-раскладку..."
        : "Перетаскивайте узлы — раскладка сохранится автоматически";

  const edgeStatus = edgePendingKey ? "Сохраняем связь..." : positionStatus;

  const flowNodesForRender = ENABLE_CLUSTER_NODES
    ? [...clusterNodes, ...displayedNodes]
    : displayedNodes;

  if (initialInterests.length === 0) {
    return <EmptyMapState />;
  }

  const togglePanel = () => setIsPanelOpen((prev) => !prev);
  const handleViewportMove: OnMove = useCallback((_event, viewport: Viewport) => {
    setCamera(viewport);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_20%_15%,rgba(129,140,248,0.16),rgba(15,23,42,0.7)),radial-gradient(circle_at_80%_85%,rgba(56,189,248,0.12),rgba(15,23,42,0.75))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(124,58,237,0.12),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_70%,rgba(79,70,229,0.08),transparent_50%)]" />
      <div ref={canvasRef} className="relative h-full min-h-[520px] w-full">
        <ReactFlow
          nodes={flowNodesForRender}
          edges={renderedEdges}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          viewport={camera}
          nodeTypes={nodeTypes}
          proOptions={{ hideAttribution: true }}
          panOnScroll={false}
          zoomOnScroll
          zoomOnPinch
          selectionOnDrag={selectionMode && !connectMode}
          panOnDrag={!selectionMode}
          deleteKeyCode={null}
          onMove={handleViewportMove}
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
          className={cn(
            "bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.03),transparent_35%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.03),transparent_35%)] [&_.react-flow__attribution]:hidden",
          )}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.6}
            color="rgba(255,255,255,0.08)"
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

          <Panel position="top-left" className="pointer-events-none">
            <div
              className={cn(
                "pointer-events-auto relative w-[min(420px,calc(100vw-24px))] max-w-[420px]",
                isPanelOpen
                  ? "max-w-[420px]"
                  : "max-w-[64px] sm:max-w-[72px]",
              )}
            >
              <div className="absolute left-0 top-0 z-20 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={isPanelOpen ? "primary" : "soft"}
                  className="h-9 rounded-full px-3 shadow-lg shadow-black/20"
                  onClick={togglePanel}
                >
                  <PanelLeft className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Панель</span>
                </Button>
              </div>

              <div
                className={cn(
                  "mt-0 overflow-hidden transition-[max-height,opacity,transform] duration-200",
                  isPanelOpen
                    ? "max-h-[calc(100vh-180px)] opacity-100"
                    : "pointer-events-none max-h-0 opacity-0",
                )}
              >
                <div className="mt-12 max-h-[calc(100vh-220px)] overflow-y-auto rounded-2xl border border-border/80 bg-background/95 px-4 py-3 text-xs shadow-xl shadow-black/15 backdrop-blur">
                  <div className="flex items-start justify-between gap-2">
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
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={togglePanel}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-[11px] shadow-inner shadow-black/5">
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
                  <div className="mt-3 grid gap-1 text-[11px] leading-relaxed text-muted-foreground">
                    <p className="text-foreground/80">{connectHint}</p>
                    <p className="text-foreground/80">{selectionStatus}</p>
                    <p>{edgeStatus}</p>
                    {edgeError ? <p className="text-destructive">{edgeError}</p> : null}
                    {selectionHint ? <p className="text-primary">{selectionHint}</p> : null}
                  </div>
                  <div className="mt-4 space-y-3 rounded-2xl border border-border/70 bg-card/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                        <span>Рекомендации</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {isLoadingRecommendations ? "Обновляем..." : "До 20 подсказок"}
                      </span>
                    </div>
                    {recommendationsError ? (
                      <p className="text-[11px] text-destructive">{recommendationsError}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {recommendations.length === 0 && !isLoadingRecommendations ? (
                        <p className="text-[11px] text-muted-foreground">
                          Пока нечего предложить. Отметьте пару интересов или наведите на узлы.
                        </p>
                      ) : null}
                      {recommendations.map((item) => (
                        <div
                          key={item.id}
                          className="group flex min-w-[200px] flex-1 items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2 shadow-inner shadow-black/5 transition hover:border-primary/40 hover:shadow-primary/10"
                        >
                          <div className="space-y-1 pr-2">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                              {item.title}
                            </p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                              <Sparkles className="h-3 w-3" aria-hidden />
                              {item.clusterLabel}
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="primary"
                            className="h-9 w-9 shrink-0 rounded-full"
                            disabled={addPendingId === item.id}
                            onClick={() => void handleAddInterestNode(item)}
                          >
                            {addPendingId === item.id ? (
                              <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <Plus className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-1 rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <CircleHelp className="h-3.5 w-3.5 text-primary" aria-hidden />
                      <span>Быстрые подсказки</span>
                    </div>
                    <p>Клик — выбрать. Shift/Ctrl — мульти.</p>
                    <p>В режиме «Соединить» наведите на второй узел — линия покажет связку, клик её сохранит.</p>
                    <p>Перетяни узел — позиция сохранится. Фит-вью внизу слева.</p>
                    <p>На мобильном включи «Режим выбора», чтобы отметить несколько.</p>
                  </div>
                </div>
              </div>
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
