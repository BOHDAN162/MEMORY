import { cn } from "@/lib/utils";
import {
  interestCategories,
  interestsByCategory,
  type Interest,
} from "@/lib/interests";

const width = 960;
const height = 620;
const center = { x: width / 2, y: height / 2 };
const ringRadius = 260;

const positions = computeLayout();
const connectionPairs = buildConnections();

export function MemoryMap({
  selectedInterests,
  className,
}: {
  selectedInterests: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,91,255,0.12),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(103,84,255,0.14),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(86,69,166,0.15),transparent_40%)]" />
      <svg viewBox={`0 0 ${width} ${height}`} className="relative z-10 h-full w-full">
        <defs>
          <linearGradient id="edgeGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(124,91,255,0.2)" />
            <stop offset="100%" stopColor="rgba(143,107,255,0.4)" />
          </linearGradient>
        </defs>

        {connectionPairs.map(([from, to]) => (
          <line
            key={`${from.interest.key}-${to.interest.key}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="url(#edgeGradient)"
            strokeWidth={2}
            strokeOpacity={0.8}
          />
        ))}

        {positions.map((node) => {
          const isActive = selectedInterests.includes(node.interest.key);
          return (
            <g key={node.interest.key}>
              <circle
                cx={node.x}
                cy={node.y}
                r={20}
                fill={isActive ? "url(#edgeGradient)" : "var(--muted-strong)"}
                fillOpacity={isActive ? 1 : 0.4}
                stroke={isActive ? "rgba(255,255,255,0.85)" : "var(--border)"}
                strokeWidth={isActive ? 2.5 : 1.5}
                className="transition-all duration-300"
              />
              <text
                x={node.x}
                y={node.y + 40}
                textAnchor="middle"
                className="text-sm font-medium fill-foreground/90"
              >
                {node.interest.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute left-4 top-4 flex flex-wrap gap-2 rounded-2xl bg-surface-strong/80 px-4 py-3 text-xs text-muted backdrop-blur">
        {interestCategories.map((category) => (
          <span
            key={category}
            className="rounded-full bg-foreground/5 px-3 py-1 font-medium text-foreground/80"
          >
            {category}
          </span>
        ))}
      </div>
    </div>
  );
}

type NodeWithPosition = {
  interest: Interest;
  x: number;
  y: number;
};

function computeLayout(): NodeWithPosition[] {
  const step = (Math.PI * 2) / interestCategories.length;

  return interestsByCategory.flatMap(({ items }, catIndex) => {
    const baseAngle = catIndex * step;
    return items.map((interest, itemIndex) => {
      const offset =
        ((itemIndex - (items.length - 1) / 2) / Math.max(items.length, 1)) *
        step *
        0.55;
      const angle = baseAngle + offset;
      const radius = ringRadius - 25 + itemIndex * 6;

      return {
        interest,
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius * 0.82,
      } satisfies NodeWithPosition;
    });
  });
}

function buildConnections(): Array<[NodeWithPosition, NodeWithPosition]> {
  const byCategory: Record<string, NodeWithPosition[]> = {};
  positions.forEach((node) => {
    if (!byCategory[node.interest.category]) {
      byCategory[node.interest.category] = [];
    }
    byCategory[node.interest.category].push(node);
  });

  const pairs: Array<[NodeWithPosition, NodeWithPosition]> = [];

  Object.values(byCategory).forEach((nodes) => {
    for (let index = 0; index < nodes.length - 1; index += 1) {
      pairs.push([nodes[index], nodes[index + 1]]);
    }
  });

  return pairs;
}
