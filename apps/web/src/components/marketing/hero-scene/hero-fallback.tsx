import { HERO_SCENE, NODE_COLOR, buildHubEdges } from "./scene-graph";

const VIEW_W = 800;
const VIEW_H = 500;
const UNIT = 78; // px per scene unit
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const HUB_W = 88;
const HUB_H = 56;

/** Project a scene position to 2D SVG coordinates (y inverted). */
function project(p: readonly [number, number, number]): { x: number; y: number } {
  return { x: CX + p[0] * UNIT, y: CY - p[1] * UNIT };
}

/**
 * Static, animation-free hero background for phones and `prefers-reduced-motion`.
 * No `<Canvas>` / WebGL — a CSS gradient plus an SVG projection of the same
 * hub-and-spoke graph (nodes wired to the IDE / terminal / agent panels).
 */
export function HeroFallback() {
  const edges = buildHubEdges(HERO_SCENE);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="gradient-radial-amber absolute inset-0" />
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="absolute inset-0 h-full w-full opacity-70"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <title>hostfunc function network</title>
        {edges.map((edge, i) => {
          const a = project(edge.from);
          const b = project(edge.to);
          return (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: static projection of a fixed graph
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={edge.color}
              strokeWidth={0.6 + edge.weight * 1.2}
              strokeOpacity={0.18 + edge.weight * 0.18}
            />
          );
        })}
        {HERO_SCENE.hubs.map((hub) => {
          const { x, y } = project(hub.position);
          return (
            <rect
              key={hub.id}
              x={x - HUB_W / 2}
              y={y - HUB_H / 2}
              width={HUB_W}
              height={HUB_H}
              rx={6}
              fill="#0a0908"
              fillOpacity={0.85}
              stroke="#e8a317"
              strokeOpacity={0.35}
            />
          );
        })}
        {HERO_SCENE.nodes.map((node) => {
          const { x, y } = project(node.position);
          return (
            <circle
              key={node.id}
              cx={x}
              cy={y}
              r={6 * node.scale}
              fill={NODE_COLOR[node.kind]}
              fillOpacity={0.9}
            />
          );
        })}
      </svg>
    </div>
  );
}
