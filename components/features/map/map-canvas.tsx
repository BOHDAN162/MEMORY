"use client";

import "@xyflow/react/dist/style.css";

import { saveMapPosition } from "@/app/actions/save-map-position";
import { cn } from "@/lib/utils/cn";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  type OnNodesChange,
  type OnNodeDrag,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";
import type { MapInterestNode } from "@/lib/types";

type InterestNodeData = {
  title: string;
  cluster: string | null;
};

type MapCanvasProps = {
  interests: MapInterestNode[];
};

const clusterKey = (cluster: string | null) => cluster?.trim() || "Без кластера";

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

const CLUSTER_COLUMNS = 2;
const CLUSTER_SPACING_X = 320;
const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 180;

const buildDefaultLayout = (interests: MapInterestNode[]) => {
  const clusters: string[] = [];
  const clusterCounts = new Map<string, number>();

  const getClusterIndex = (cluster: string) => {
    const existingIndex = clusters.indexOf(cluster);
    if (existingIndex >= 0) return existingIndex;
    clusters.push(cluster);
    return clusters.length - 1;
  };

  return interests.map((interest) => {
    const cluster = clusterKey(interest.cluster);
    const clusterIndex = getClusterIndex(cluster);
    const count = clusterCounts.get(cluster) ?? 0;
    clusterCounts.set(cluster, count + 1);

    const column = count % CLUSTER_COLUMNS;
    const row = Math.floor(count / CLUSTER_COLUMNS);

    const x = clusterIndex * CLUSTER_SPACING_X + column * COLUMN_WIDTH;
    const y = row * ROW_HEIGHT;

    return {
      id: interest.id,
      position: interest.position ?? { x, y },
    };
  });
};

const buildInitialNodes = (interests: MapInterestNode[]): InterestFlowNode[] => {
  const layout = buildDefaultLayout(interests);
  const positionMap = new Map(layout.map((item) => [item.id, item.position]));

  return interests.map((interest) => ({
    id: interest.id,
    type: "interest",
    position: positionMap.get(interest.id) ?? { x: 0, y: 0 },
    data: {
      title: interest.title,
      cluster: interest.cluster,
    },
  }));
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

export const MapCanvas = ({ interests }: MapCanvasProps) => {
  const initialNodes = useMemo(() => buildInitialNodes(interests), [interests]);
  const edges = useMemo<Edge[]>(() => [], []);
  const [nodes, , onNodesChange] = useNodesState<InterestFlowNode>(initialNodes);
  const [lastSavedPositions, setLastSavedPositions] = useState<Map<string, { x: number; y: number }>>(
    () =>
      new Map(
        initialNodes.map((node) => [
          node.id,
          { x: node.position.x, y: node.position.y },
        ]),
      ),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleNodesChange: OnNodesChange<InterestFlowNode> = useCallback(
    (changes) => {
      onNodesChange(changes);
    },
    [onNodesChange],
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
      } else {
        setLastSavedPositions((prev) => {
          const next = new Map(prev);
          next.set(interestId, { x: position.x, y: position.y });
          return next;
        });
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
            fitView
            minZoom={0.4}
            maxZoom={1.6}
            nodeTypes={nodeTypes}
            panOnScroll
            selectionOnDrag={false}
            panOnDrag
            deleteKeyCode={null}
            onNodesChange={handleNodesChange}
            onNodeDragStop={handleNodeDragStop}
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
              {pendingNodeId && isSaving ? "Сохраняем позицию..." : "Перетаскивайте узлы свободно"}
            </Panel>
          </ReactFlow>
        </div>
      </ReactFlowProvider>
      {saveError ? (
        <div className="absolute inset-x-0 bottom-0 bg-destructive/90 px-4 py-2 text-center text-sm font-semibold text-destructive-foreground">
          Не удалось сохранить позицию: {saveError}
        </div>
      ) : null}
    </div>
  );
};
