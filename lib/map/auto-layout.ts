import type { MapInterestNode } from "@/lib/types";

export type Position = { x: number; y: number };

export type LayoutOptions = {
  nodeWidth?: number;
  nodeHeight?: number;
  xGap?: number;
  yGap?: number;
  panelGapX?: number;
  panelGapY?: number;
};

const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 200,
  nodeHeight: 68,
  xGap: 220,
  yGap: 120,
  panelGapX: 520,
  panelGapY: 360,
};

export const clusterKey = (cluster: string | null) => cluster?.trim() || "Без кластера";

export const CLUSTER_ORDER = [
  "business",
  "learning",
  "self",
  "creativity",
  "health",
  "finance",
  "communication",
  "other",
] as const;

const CLUSTER_LABELS: Record<(typeof CLUSTER_ORDER)[number], string> = {
  business: "Бизнес",
  learning: "Обучение",
  self: "Саморазвитие",
  creativity: "Творчество",
  health: "Здоровье",
  finance: "Финансы",
  communication: "Коммуникации",
  other: "Другое",
};

const CLUSTER_MATCHERS: Array<[RegExp, (typeof CLUSTER_ORDER)[number]]> = [
  [/business|бизнес|предприним|маркетинг|sales|продаж/, "business"],
  [/learn|study|education|обуч|курс|школ|навык/, "learning"],
  [/self|личн|саморазв|развитие|growth/, "self"],
  [/creative|креатив|art|дизайн|муз|писат|контент/, "creativity"],
  [/health|здоров|fitness|спорт|йога|медиц/, "health"],
  [/finance|финанс|money|инвест|budget|капитал/, "finance"],
  [/commun|общен|communication|network|relationship|переговор/, "communication"],
];

export const normalizeClusterKey = (cluster: string | null) => {
  if (!cluster) return "other";
  const raw = cluster.toLowerCase().trim();
  if (!raw) return "other";
  const normalized = raw.replace(/[^a-zа-я0-9]+/gi, "");

  for (const [matcher, key] of CLUSTER_MATCHERS) {
    if (matcher.test(normalized) || matcher.test(raw)) {
      return key;
    }
  }

  return CLUSTER_ORDER.includes(raw as (typeof CLUSTER_ORDER)[number])
    ? (raw as (typeof CLUSTER_ORDER)[number])
    : "other";
};

export const clusterLabel = (cluster: string | null) =>
  CLUSTER_LABELS[normalizeClusterKey(cluster)];

const getClusterColumns = (clusterCount: number) => {
  if (clusterCount <= 2) return 1;
  if (clusterCount <= 6) return 2;
  if (clusterCount <= 12) return 3;
  return 4;
};

const averagePosition = (positions: Position[]): Position => {
  if (positions.length === 0) return { x: 0, y: 0 };

  const sum = positions.reduce(
    (acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y }),
    { x: 0, y: 0 },
  );

  return { x: sum.x / positions.length, y: sum.y / positions.length };
};

const clusterSorter = (a: [string, MapInterestNode[]], b: [string, MapInterestNode[]]) => {
  const orderIndex = (key: string) => {
    const index = CLUSTER_ORDER.indexOf(key as (typeof CLUSTER_ORDER)[number]);
    return index === -1 ? CLUSTER_ORDER.length : index;
  };

  const orderDelta = orderIndex(a[0]) - orderIndex(b[0]);
  if (orderDelta !== 0) return orderDelta;
  if (b[1].length !== a[1].length) {
    return b[1].length - a[1].length;
  }
  return a[0].localeCompare(b[0]);
};

const normalizeOptions = (options?: LayoutOptions): Required<LayoutOptions> => ({
  ...DEFAULT_LAYOUT_OPTIONS,
  ...options,
});

export const computeClusterLayout = (
  nodes: MapInterestNode[],
  options?: LayoutOptions,
): Map<string, Position> => {
  const opts = normalizeOptions(options);
  const clusters = new Map<string, MapInterestNode[]>();

  nodes.forEach((node) => {
    const key = normalizeClusterKey(node.cluster);
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(node);
  });

  clusters.forEach((clusterNodes) =>
    clusterNodes.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)),
  );

  const sortedClusters = Array.from(clusters.entries()).sort(clusterSorter);
  const clusterColumns = getClusterColumns(sortedClusters.length);
  const positionMap = new Map<string, Position>();

  sortedClusters.forEach(([, clusterNodes], index) => {
    const column = index % clusterColumns;
    const row = Math.floor(index / clusterColumns);

    const clusterCenterX = column * opts.panelGapX;
    const clusterCenterY = row * opts.panelGapY;

    const internalColumns = Math.ceil(Math.sqrt(clusterNodes.length));
    const internalRows = Math.ceil(clusterNodes.length / internalColumns);

    const totalWidth = (internalColumns - 1) * opts.xGap;
    const totalHeight = (internalRows - 1) * opts.yGap;

    const startX = clusterCenterX - totalWidth / 2;
    const startY = clusterCenterY - totalHeight / 2;

    clusterNodes.forEach((node, nodeIndex) => {
      const xOffset = nodeIndex % internalColumns;
      const yOffset = Math.floor(nodeIndex / internalColumns);

      positionMap.set(node.id, {
        x: startX + xOffset * opts.xGap,
        y: startY + yOffset * opts.yGap,
      });
    });
  });

  return positionMap;
};

const generateGridOffsets = (count: number, xGap: number, yGap: number): Position[] => {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const offsets: Position[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      offsets.push({
        x: (col - (cols - 1) / 2) * xGap,
        y: (row - (rows - 1) / 2) * yGap,
      });
    }
  }

  return offsets;
};

export const placeMissingNodesNearClusters = (
  nodes: MapInterestNode[],
  savedPositions: Map<string, Position>,
  options?: LayoutOptions,
): { positionMap: Map<string, Position>; newlyPositionedIds: string[] } => {
  const opts = normalizeOptions(options);
  const positionMap = new Map(savedPositions);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  const missingNodes = nodes.filter((node) => !positionMap.has(node.id));
  if (missingNodes.length === 0) {
    return { positionMap, newlyPositionedIds: [] };
  }

  const defaultLayout = computeClusterLayout(nodes, opts);
  const clusterFallbackPositions = new Map<string, Position[]>();
  Array.from(defaultLayout.entries()).forEach(([id, position]) => {
    const node = nodesById.get(id);
    if (!node) return;
    const key = normalizeClusterKey(node.cluster);
    const existing = clusterFallbackPositions.get(key) ?? [];
    existing.push(position);
    clusterFallbackPositions.set(key, existing);
  });

  const savedClusterPositions = new Map<string, Position[]>();
  positionMap.forEach((pos, id) => {
    const node = nodesById.get(id);
    if (!node) return;
    const key = normalizeClusterKey(node.cluster);
    const list = savedClusterPositions.get(key) ?? [];
    list.push(pos);
    savedClusterPositions.set(key, list);
  });

  const missingByCluster = new Map<string, MapInterestNode[]>();
  missingNodes.forEach((node) => {
    const key = normalizeClusterKey(node.cluster);
    const list = missingByCluster.get(key) ?? [];
    list.push(node);
    missingByCluster.set(key, list);
  });

  const newlyPositionedIds: string[] = [];
  const minDistance = Math.min(opts.xGap, opts.yGap) * 0.5;

  const isOccupied = (candidate: Position, used: Position[]) =>
    used.some((pos) => Math.hypot(pos.x - candidate.x, pos.y - candidate.y) < minDistance);

  missingByCluster.forEach((clusterNodes, clusterName) => {
    const saved = savedClusterPositions.get(clusterName) ?? [];
    const anchor =
      saved.length > 0
        ? averagePosition(saved)
        : averagePosition(clusterFallbackPositions.get(clusterName) ?? []);

    const usedPositions = [...saved];
    const offsets = generateGridOffsets(clusterNodes.length * 2, opts.xGap, opts.yGap);

    clusterNodes
      .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
      .forEach((node, index) => {
        const defaultPosition = defaultLayout.get(node.id);
        const offsetPositions = offsets.slice(index, index + offsets.length).map((offset) => ({
          x: anchor.x + offset.x,
          y: anchor.y + offset.y,
        }));
        const candidates = [...(defaultPosition ? [defaultPosition] : []), ...offsetPositions];

        let chosen: Position | null = null;
        for (const offset of candidates) {
          if (!isOccupied(offset, usedPositions)) {
            chosen = offset;
            break;
          }
        }

        const finalPosition =
          chosen ??
          {
            x: anchor.x + index * (opts.xGap / 1.5),
            y: anchor.y + index * (opts.yGap / 1.5),
          };

        usedPositions.push(finalPosition);
        positionMap.set(node.id, finalPosition);
        newlyPositionedIds.push(node.id);
      });
  });

  return { positionMap, newlyPositionedIds };
};
