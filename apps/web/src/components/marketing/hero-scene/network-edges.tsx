"use client";

import { Line } from "@react-three/drei";

import type { ResolvedEdge } from "./scene-graph";

/** Static glowing wires from each function node to its panel. Subtle — the
 *  streaming packets carry the eye; the wire just shows the connection. */
export function NetworkEdges({ edges }: { edges: ResolvedEdge[] }) {
  return (
    <>
      {edges.map((edge, i) => (
        <Line
          // biome-ignore lint/suspicious/noArrayIndexKey: deterministic static set built once at mount
          key={i}
          points={[edge.from, edge.to]}
          color={edge.color}
          lineWidth={0.3 + edge.weight * 0.4}
          transparent
          opacity={0.12 + edge.weight * 0.12}
          depthWrite={false}
          renderOrder={0}
        />
      ))}
    </>
  );
}
