"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ExecutionLineageEdge } from "@/server/executions";

interface ExecutionOption {
  id: string;
  fnSlug: string;
  status: "ok" | "fn_error" | "limit_exceeded" | "infra_error";
  startedAt: string;
}

interface LineageNode {
  id: string;
  fnId: string;
  fnSlug: string;
  status: "ok" | "fn_error" | "limit_exceeded" | "infra_error";
  triggerKind: string;
  wallMs: number;
  cpuMs: number;
  startedAt: string;
  endedAt: string | null;
  parentExecutionId: string | null;
  callDepth: number;
}

interface ExecutionLineageGraphProps {
  fnId: string;
  selectedExecutionId: string | null;
  availableExecutions: ExecutionOption[];
  nodes: LineageNode[];
  edges: ExecutionLineageEdge[];
}

const WIDTH = 920;
const HEIGHT = 520;

export function ExecutionLineageGraph({
  fnId,
  selectedExecutionId,
  availableExecutions,
  nodes,
  edges,
}: ExecutionLineageGraphProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(selectedExecutionId);

  const positions = useMemo(() => layoutNodes(nodes, edges), [nodes, edges]);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const focusedNode = nodeById.get(focusedNodeId ?? "") ?? null;
  const maxWeight = Math.max(1, ...edges.map((edge) => edge.weight));

  const onExecutionChange = (executionId: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("executionId", executionId);
    router.replace(`${pathname}?${next.toString()}`);
    setFocusedNodeId(executionId);
  };

  if (availableExecutions.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-8 text-sm text-[var(--color-bone-muted)]">
        No executions found for this function yet. Run the function at least once to see lineage.
      </div>
    );
  }

  if (nodes.length === 0 || !selectedExecutionId) {
    return (
      <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6">
        <ExecutionSelector
          selectedExecutionId={selectedExecutionId}
          options={availableExecutions}
          onChange={onExecutionChange}
        />
        <p className="text-sm text-[var(--color-bone-muted)]">
          Selected execution could not be resolved from the current lineage window.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-4">
        <ExecutionSelector
          selectedExecutionId={selectedExecutionId}
          options={availableExecutions}
          onChange={onExecutionChange}
        />
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full">
            <defs>
              <marker id="lineage-arrow-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <title>Lineage edge arrow</title>
                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(232,163,23,0.8)" />
              </marker>
              <marker id="lineage-arrow-error" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <title>Error lineage edge arrow</title>
                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(239,68,68,0.85)" />
              </marker>
            </defs>
            {Array.from({ length: 14 }, (_, idx) => idx * 70).map((x) => (
              <line key={`x-${x}`} x1={x} y1={0} x2={x} y2={HEIGHT} stroke="rgba(255,255,255,0.04)" />
            ))}
            {Array.from({ length: 8 }, (_, idx) => idx * 70).map((y) => (
              <line key={`y-${y}`} x1={0} y1={y} x2={WIDTH} y2={y} stroke="rgba(255,255,255,0.03)" />
            ))}
            {edges.map((edge) => {
              const from = positions[edge.source];
              const to = positions[edge.target];
              if (!from || !to) return null;
              const normalized = edge.weight / maxWeight;
              const strokeWidth = 1.5 + normalized * 4;
              const opacity = 0.35 + normalized * 0.6;
              const color = edge.hasError ? "rgba(239,68,68,0.9)" : "rgba(232,163,23,0.85)";
              return (
                <line
                  key={`${edge.source}-${edge.target}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  markerEnd={edge.hasError ? "url(#lineage-arrow-error)" : "url(#lineage-arrow-ok)"}
                />
              );
            })}
            {nodes.map((node) => {
              const pos = positions[node.id];
              if (!pos) return null;
              const isFocused = node.id === focusedNode?.id;
              const isError = node.status !== "ok";
              return (
                <g
                  key={node.id}
                  onPointerDown={() => setFocusedNodeId(node.id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isFocused ? 31 : 24}
                    fill={isError ? "rgba(239,68,68,0.14)" : "rgba(232,163,23,0.13)"}
                  />
                  <rect
                    x={pos.x - 74}
                    y={pos.y - 20}
                    width={148}
                    height={40}
                    rx={10}
                    fill="#171512"
                    stroke={isError ? "rgba(239,68,68,0.8)" : "rgba(232,163,23,0.7)"}
                    strokeWidth={isFocused ? 2 : 1}
                  />
                  <text x={pos.x} y={pos.y - 2} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="#f4f2ec">
                    {node.fnSlug}
                  </text>
                  <text x={pos.x} y={pos.y + 12} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} fill="rgba(244,242,236,0.72)">
                    {node.id.slice(0, 8)} · {node.status}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-5">
        {focusedNode ? (
          <div className="space-y-4 text-sm">
            <h2 className="text-base font-semibold text-[var(--color-bone)]">Execution Details</h2>
            <div className="space-y-2 text-[var(--color-bone-muted)]">
              <p><span className="text-[var(--color-bone)]">ID:</span> <span className="font-mono">{focusedNode.id}</span></p>
              <p><span className="text-[var(--color-bone)]">Function:</span> {focusedNode.fnSlug}</p>
              <p><span className="text-[var(--color-bone)]">Status:</span> {focusedNode.status}</p>
              <p><span className="text-[var(--color-bone)]">Trigger:</span> {focusedNode.triggerKind}</p>
              <p><span className="text-[var(--color-bone)]">Wall:</span> {focusedNode.wallMs} ms</p>
              <p><span className="text-[var(--color-bone)]">CPU:</span> {focusedNode.cpuMs} ms</p>
              <p><span className="text-[var(--color-bone)]">Started:</span> {new Date(focusedNode.startedAt).toLocaleString()}</p>
              <p><span className="text-[var(--color-bone)]">Ended:</span> {focusedNode.endedAt ? new Date(focusedNode.endedAt).toLocaleString() : "running"}</p>
            </div>
            <Link
              href={`/dashboard/${fnId}/executions/${focusedNode.id}`}
              className="inline-flex rounded-md border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--color-bone)] hover:bg-white/[0.07]"
            >
              Open Execution
            </Link>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-bone-muted)]">Select an execution node to inspect details.</p>
        )}
      </aside>
    </div>
  );
}

function ExecutionSelector({
  selectedExecutionId,
  options,
  onChange,
}: {
  selectedExecutionId: string | null;
  options: ExecutionOption[];
  onChange: (executionId: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="lineage-execution-select" className="text-xs font-medium uppercase tracking-wide text-[var(--color-bone-faint)]">
        Root Execution
      </label>
      <select
        id="lineage-execution-select"
        value={selectedExecutionId ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-ink)] px-3 py-2 text-sm text-[var(--color-bone)] outline-none ring-0 focus:border-[var(--color-amber)]"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.fnSlug} · {option.status} · {new Date(option.startedAt).toLocaleString()}
          </option>
        ))}
      </select>
    </div>
  );
}

function layoutNodes(nodes: LineageNode[], edges: ExecutionLineageEdge[]) {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    const incomingList = incoming.get(edge.target);
    const outgoingList = outgoing.get(edge.source);
    if (incomingList) incomingList.push(edge.source);
    if (outgoingList) outgoingList.push(edge.target);
  }

  const roots = nodes.filter((node) => !incoming.has(node.id)).map((node) => node.id);
  const depthByNode = new Map<string, number>();
  const queue: Array<[string, number]> = roots.map((nodeId) => [nodeId, 0]);
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) continue;
    const [nodeId, depth] = next;
    if ((depthByNode.get(nodeId) ?? -1) >= depth) continue;
    depthByNode.set(nodeId, depth);
    for (const childId of outgoing.get(nodeId) ?? []) queue.push([childId, depth + 1]);
  }

  for (const node of nodes) {
    if (!depthByNode.has(node.id)) depthByNode.set(node.id, 0);
  }

  const nodesByDepth = new Map<number, string[]>();
  for (const node of nodes) {
    const depth = depthByNode.get(node.id) ?? 0;
    const bucket = nodesByDepth.get(depth) ?? [];
    bucket.push(node.id);
    nodesByDepth.set(depth, bucket);
  }

  const maxDepth = Math.max(0, ...nodesByDepth.keys());
  const xPadding = 90;
  const yPadding = 72;
  const positions: Record<string, { x: number; y: number }> = {};

  for (const [depth, ids] of nodesByDepth) {
    const x = maxDepth === 0 ? WIDTH / 2 : xPadding + (depth / maxDepth) * (WIDTH - xPadding * 2);
    ids.forEach((id, index) => {
      const y =
        ids.length === 1
          ? HEIGHT / 2
          : yPadding + (index / (ids.length - 1)) * (HEIGHT - yPadding * 2);
      positions[id] = { x, y };
    });
  }

  return positions;
}
