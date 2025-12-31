"use client";

import "@xyflow/react/dist/style.css";

import { createManualEdgeAction } from "@/app/actions/create-manual-edge";
import { deleteManualEdgeAction } from "@/app/actions/delete-manual-edge";
import { saveMapPosition } from "@/app/actions/save-map-position";
import { saveMapPositions } from "@/app/actions/save-map-positions";
import { clusterKey, computeClusterLayout, placeMissingNodesNearClusters } from "@/lib/map/auto-layout";
import type { MapInterestNode, MapManualEdge } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import {
  Background,
  Controls,
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
  type NodeProps,
  type OnNodesChange,
  type OnNodeDrag,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type InterestNodeData = {
  title: string;
  cluster: string | null;
};

type MapCanvasProps = {
  interests: MapInterestNode[];
  manualEdges: MapManualEdge[];
};

type InterestFlowNode = Node<InterestNodeData>;

const InterestNodeCard = ({ data }: NodeProps<InterestFlowNode>) => {
  return (
    <div className="min-w-[180px] rounded-2xl border border-border/70 bg-card/90 px-4 py-3 text-left shadow-lg shadow-black/20 ring-1 ring-inset ring-primary/10 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
        {clusterKey(data.cluster)}
      </p>
      <p className="text-sm font-semibold leading-snug text-foreground">{data.title}</p>
    </div>
  );
};

const nodeTypes = { interest: InterestNodeCard };

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

const AUTO_EDGE_STYLE = {
  stroke: "rgba(255,255,255,0.32)",
  strokeWidth: 1.6,
};

const MANUAL_EDGE_STYLE = {
  stroke: "rgba(124,58,237,0.95)",
  strokeWidth: 2.3,
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
  label: "•",
  labelStyle: {
    fontSize: 10,
    color: "hsl(var(--primary))",
  },
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
  const [nodes, , onNodesChange] = useNodesState<InterestFlowNode>(initialNodes);
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
      if (!node?.id || !node.position) return;

      const previous = lastSavedPositions.get(node.id);
      if (!hasPositionChanged(previous, node.position)) return;

      void persistPosition(node.id, node.position);
    },
    [lastSavedPositions, persistPosition],
  );

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

  const handleNodeClick = useCallback(
    (_event: unknown, node: InterestFlowNode) => {
      if (!connectMode || !node?.id || edgePendingKey) return;

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
    },
    [connectFromId, connectMode, createManualEdge, edgePendingKey],
  );

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

  const positionStatus =
    pendingNodeId && isSaving
      ? "Сохраняем позицию..."
      : newlyPositionedIds.length > 0 && isSaving
        ? "Формируем авто-раскладку..."
        : "Перетаскивайте узлы свободно";

  const edgeStatus = edgePendingKey ? "Сохраняем связь..." : positionStatus;

  if (interests.length === 0) {
    return (
      <div className="flex h-[60vh] min-h-[360px] w-full items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/60 text-center shadow-inner shadow-black/5">
        <div className="max-w-md space-y-2">
          <p className="text-sm font-semibold text-foreground">Интересы не выбраны</p>
          <p className="text-sm text-muted-foreground">
            Добавьте темы в разделе &laquo;Контент&raquo;, чтобы построить карту.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)]">
      <ReactFlowProvider>
        <div className="h-[70vh] min-h-[460px] w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            minZoom={0.4}
            maxZoom={1.6}
            nodeTypes={nodeTypes}
            panOnScroll
            selectionOnDrag={false}
            panOnDrag
            deleteKeyCode={null}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodeDragStop={handleNodeDragStop}
            onNodeClick={handleNodeClick}
            onSelectionChange={handleSelectionChange}
            className={cn("bg-gradient-to-b from-background to-background/60")}
          >
            <Background gap={18} size={1.5} color="rgba(255,255,255,0.08)" />
            <MiniMap
              className="!bg-card/80 !text-muted-foreground"
              nodeColor="rgba(124, 58, 237, 0.8)"
              nodeBorderRadius={12}
              pannable
              zoomable
            />
            <Controls className="!bg-card !border-border !text-foreground" position="bottom-left" />
            <Panel
              position="top-right"
              className="rounded-xl bg-background/90 px-3 py-2 text-xs shadow-lg shadow-black/10 ring-1 ring-border"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConnectToggle}
                  disabled={Boolean(edgePendingKey)}
                  aria-pressed={connectMode}
                  className={cn(
                    "rounded-full border px-3 py-1 font-semibold transition",
                    edgePendingKey
                      ? "cursor-not-allowed border-border/70 bg-muted text-muted-foreground"
                      : connectMode
                        ? "border-primary/70 bg-primary/90 text-primary-foreground shadow-sm shadow-primary/30"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary",
                  )}
                >
                  Соединить
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteManualEdge()}
                  disabled={!canDeleteSelected || Boolean(edgePendingKey)}
                  className={cn(
                    "rounded-full border px-3 py-1 font-semibold transition",
                    !canDeleteSelected || edgePendingKey
                      ? "cursor-not-allowed border-border/70 bg-muted text-muted-foreground"
                      : "border-border bg-card text-foreground hover:border-destructive/50 hover:text-destructive",
                  )}
                >
                  Удалить связь
                </button>
              </div>
              <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                <p className="text-foreground/80">{connectHint}</p>
                <p>{edgeStatus}</p>
                {edgeError ? <p className="text-destructive">{edgeError}</p> : null}
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </ReactFlowProvider>
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
    return (
      <div className="flex h-[60vh] min-h-[360px] w-full items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/60 text-center shadow-inner shadow-black/5">
        <div className="max-w-md space-y-2">
          <p className="text-sm font-semibold text-foreground">Интересы не выбраны</p>
          <p className="text-sm text-muted-foreground">
            Добавьте темы в разделе &laquo;Контент&raquo;, чтобы построить карту.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)]">
      <ReactFlowProvider>
        <MapCanvasInner key={layoutKey} interests={interests} manualEdges={manualEdges} />
      </ReactFlowProvider>
    </div>
  );
};
