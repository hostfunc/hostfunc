"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LineageEdgeSeed, LineageNodeSeed } from "@/lib/marketing-content";

interface Props {
  nodes: LineageNodeSeed[];
  edges: LineageEdgeSeed[];
  /** ms between each node appearing */
  staggerMs?: number;
  /** auto-loop the build animation */
  loop?: boolean;
}

const WIDTH = 520;
const HEIGHT = 360;

export function LineageBuilder({
  nodes,
  edges,
  staggerMs = 600,
  loop = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { margin: "-50px" });
  const [revealed, setRevealed] = useState(0);

  const positions = useMemo(() => layoutNodes(nodes, edges), [nodes, edges]);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    let canceled = false;

    const tick = () => {
      if (canceled) return;
      setRevealed(i);
      i += 1;
      if (i <= nodes.length + edges.length) {
        setTimeout(tick, staggerMs);
      } else if (loop) {
        setTimeout(() => {
          if (canceled) return;
          i = 0;
          tick();
        }, 2400);
      }
    };
    tick();
    return () => {
      canceled = true;
    };
  }, [inView, nodes.length, edges.length, staggerMs, loop]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)] shadow-2xl shadow-black/40"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-ink)] px-4 py-2.5">
        <span className="font-mono text-[11px] tracking-wide text-[var(--color-bone-faint)]">
          /dashboard/lineage
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--color-bone-faint)]">
          <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-emerald)]" />
          live
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block w-full"
        style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}
      >
        <defs>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e8a317" opacity="0.6" />
          </marker>
        </defs>

        {/* Subtle grid */}
        <g stroke="rgba(255,255,255,0.04)">
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={i} x1={0} y1={i * 40} x2={WIDTH} y2={i * 40} />
          ))}
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={i} x1={i * 40} y1={0} x2={i * 40} y2={HEIGHT} />
          ))}
        </g>

        {/* Edges */}
        {edges.map((e, i) => {
          const from = positions[e.source];
          const to = positions[e.target];
          if (!from || !to) return null;
          const isRevealed = revealed > nodes.length + i;
          const length = Math.hypot(to.x - from.x, to.y - from.y);
          return (
            <motion.line
              key={`edge-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#e8a317"
              strokeWidth={1 + e.weight * 1.6}
              strokeOpacity={0.55}
              strokeLinecap="round"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                isRevealed
                  ? { pathLength: 1, opacity: 0.55 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ strokeDasharray: length, strokeDashoffset: 0 }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => {
          const pos = positions[n.id];
          if (!pos) return null;
          const isRevealed = revealed > i;
          return (
            <motion.g
              key={n.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={isRevealed ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
            >
              {/* Glow halo */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={26 + n.weight * 12}
                fill={n.scratch ? "rgba(125, 211, 252, 0.08)" : "rgba(232, 163, 23, 0.08)"}
              />
              {/* Node body */}
              <rect
                x={pos.x - 56}
                y={pos.y - 18}
                width={112}
                height={36}
                rx={10}
                fill="#1a1816"
                stroke={n.scratch ? "#7dd3fc" : "#e8a317"}
                strokeOpacity={0.5}
              />
              {n.scratch && (
                <circle
                  cx={pos.x - 44}
                  cy={pos.y}
                  r={2.5}
                  fill="#7dd3fc"
                />
              )}
              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={11}
                fill="#fafaf6"
              >
                {n.label}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Lay out nodes by depth (number of incoming edges from another node) on the
 * x-axis, distributed vertically within each depth column.
 */
function layoutNodes(
  nodes: LineageNodeSeed[],
  edges: LineageEdgeSeed[],
): Record<string, { x: number; y: number }> {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const e of edges) {
    if (!incoming.has(e.target)) incoming.set(e.target, []);
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    incoming.get(e.target)!.push(e.source);
    outgoing.get(e.source)!.push(e.target);
  }

  const depth = new Map<string, number>();
  const roots = nodes.filter((n) => !incoming.has(n.id));
  const queue: Array<[string, number]> = roots.map((n) => [n.id, 0]);
  while (queue.length > 0) {
    const [id, d] = queue.shift()!;
    if ((depth.get(id) ?? -1) >= d) continue;
    depth.set(id, d);
    for (const next of outgoing.get(id) ?? []) {
      queue.push([next, d + 1]);
    }
  }
  for (const n of nodes) {
    if (!depth.has(n.id)) depth.set(n.id, 0);
  }

  const byDepth = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depth.get(n.id)!;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(n.id);
  }

  const maxDepth = Math.max(0, ...Array.from(byDepth.keys()));
  const positions: Record<string, { x: number; y: number }> = {};
  const padding = 80;

  for (const [d, ids] of byDepth) {
    const x =
      maxDepth === 0
        ? WIDTH / 2
        : padding + (d / maxDepth) * (WIDTH - padding * 2);
    const colHeight = HEIGHT - padding * 2;
    ids.forEach((id, i) => {
      const y =
        ids.length === 1
          ? HEIGHT / 2
          : padding + (i / (ids.length - 1)) * colHeight;
      positions[id] = { x, y };
    });
  }

  return positions;
}