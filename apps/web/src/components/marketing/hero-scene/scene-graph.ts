/**
 * Pure scene-graph data for the marketing hero (no React, no three runtime).
 *
 * Kept framework-free so it is SSR-safe and unit-testable. The render modules
 * under `hero-scene/` consume this and own all three.js concerns.
 *
 * The hero tells the hostfunc story as a hub-and-spoke graph: every function
 * `node` connects to exactly one of three surfaces (`hub`) — the IDE you author
 * in, the terminal you deploy/run from, and the AI agent that orchestrates them.
 * Node labels mirror real product function names so the story reads as truthful.
 */

export type NodeKind = "core" | "connector" | "scratch";

/** The three focal surfaces every node connects to. */
export type HubKind = "ide" | "terminal" | "agent";

export interface SceneNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** The surface this function connects to. Every node connects to exactly one. */
  hub: HubKind;
  /** Explicit, deterministic position — never randomized at module scope. */
  position: readonly [number, number, number];
  scale: number;
}

export interface SceneHub {
  id: HubKind;
  /** Panel center, in scene units. Spokes terminate here. */
  position: readonly [number, number, number];
  /** Panel tilt (radians) so it faces roughly toward the camera. */
  rotation: readonly [number, number, number];
}

export interface SceneGraph {
  nodes: SceneNode[];
  hubs: SceneHub[];
}

/** On-brand color per node kind, resolved here from the globals.css palette. */
export const NODE_COLOR: Record<NodeKind, string> = {
  core: "#e8a317", // --color-amber
  connector: "#10b981", // --color-emerald
  scratch: "#22d3ee", // --color-cyan
};

/**
 * Hand-authored layout. Three clusters frame the centered headline: the IDE on
 * the left, the AI agent on the right, the terminal along the bottom. Nodes sit
 * a clear margin *behind* the panels in Z (panels at z≈-1.1..-1.4, nodes at
 * z≈-1.9..-2.1) so the panels occlude the wires/packets and read as the front
 * surfaces. Side-cluster nodes are kept inboard of their panel so the orbs stay
 * visible rather than hiding directly behind the glass.
 */
export const HERO_SCENE: SceneGraph = {
  hubs: [
    { id: "ide", position: [-3.4, 0.4, -1.3], rotation: [0.04, 0.42, 0.02] },
    { id: "agent", position: [3.4, 0.4, -1.4], rotation: [0.04, -0.42, -0.02] },
    { id: "terminal", position: [0, -2.4, -1.1], rotation: [0.36, 0, 0] },
  ],
  nodes: [
    // ── IDE cluster (left): functions you author ──────────────────────────
    {
      id: "weather",
      label: "weather-digest",
      kind: "core",
      hub: "ide",
      position: [-1.2, 1.4, -1.9],
      scale: 1.0,
    },
    {
      id: "scratch",
      label: "scratch-9k2x",
      kind: "scratch",
      hub: "ide",
      position: [-1.75, 0.45, -2.1],
      scale: 0.85,
    },
    {
      id: "github",
      label: "github-lookup",
      kind: "connector",
      hub: "ide",
      position: [-1.4, -0.6, -2.0],
      scale: 0.9,
    },
    // ── Agent cluster (right): functions the agent orchestrates ────────────
    {
      id: "claude",
      label: "claude",
      kind: "core",
      hub: "agent",
      position: [1.2, 1.4, -1.9],
      scale: 1.1,
    },
    {
      id: "hn",
      label: "hn-top",
      kind: "core",
      hub: "agent",
      position: [1.75, 0.45, -2.1],
      scale: 0.9,
    },
    {
      id: "scratch2",
      label: "scratch-7f3a",
      kind: "scratch",
      hub: "agent",
      position: [1.4, -0.6, -2.0],
      scale: 0.8,
    },
    // ── Terminal cluster (bottom): one function deployed / run ─────────────
    {
      id: "ai",
      label: "ai-summarize",
      kind: "core",
      hub: "terminal",
      position: [0, -0.9, -1.9],
      scale: 1.05,
    },
  ],
};

/** Denormalized spoke with resolved endpoint positions, built once at mount. */
export interface ResolvedEdge {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  /** Color of the source node — pulses inherit it. */
  color: string;
  weight: number;
  /** True if the source is a scratch (ephemeral) node. */
  ephemeral: boolean;
}

/**
 * Resolve every node into a spoke connecting it to its assigned hub. Nodes whose
 * hub doesn't exist are dropped (shouldn't happen — the test guards it).
 */
export function buildHubEdges(graph: SceneGraph): ResolvedEdge[] {
  const hubById = new Map(graph.hubs.map((h) => [h.id, h] as const));
  const edges: ResolvedEdge[] = [];
  for (const node of graph.nodes) {
    const hub = hubById.get(node.hub);
    if (!hub) continue;
    edges.push({
      from: node.position,
      to: hub.position,
      color: NODE_COLOR[node.kind],
      weight: 0.5 + node.scale * 0.3,
      ephemeral: node.kind === "scratch",
    });
  }
  return edges;
}

/** Look up a hub by id (hubs are a fixed, tiny set). */
export function hubById(graph: SceneGraph, id: HubKind): SceneHub | undefined {
  return graph.hubs.find((h) => h.id === id);
}

/**
 * Deterministic PRNG (mulberry32). Used for incidental per-node jitter (bob
 * phase offsets) so the scene is reproducible — never `Math.random`.
 */
export function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
