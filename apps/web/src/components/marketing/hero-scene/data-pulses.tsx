"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Quaternion, Vector3 } from "three";
import type { Mesh, MeshBasicMaterial } from "three";

import type { ResolvedEdge } from "./scene-graph";

const PACKETS_PER_EDGE = 4;
const BASE_SPEED = 0.32; // traversals per second, node → panel
const EPHEMERAL_SPEED = 0.5;
const CAP_UP = new Vector3(0, 1, 0); // capsule's long axis

/** A continuous stream of data packets sliding caller → callee along one wire. */
function EdgePackets({ edge }: { edge: ResolvedEdge }) {
  const meshRefs = useRef<(Mesh | null)[]>([]);

  const from = useMemo(() => new Vector3(...edge.from), [edge.from]);
  const dir = useMemo(
    () => new Vector3(...edge.to).sub(new Vector3(...edge.from)),
    [edge.from, edge.to],
  );
  // Orient packets along the wire (computed once — the wire is static).
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(CAP_UP, dir.clone().normalize()),
    [dir],
  );
  const speed = edge.ephemeral ? EPHEMERAL_SPEED : BASE_SPEED;
  const size = 0.6 + 0.5 * edge.weight;

  useFrame((state) => {
    const base = state.clock.elapsedTime * speed;
    for (let k = 0; k < PACKETS_PER_EDGE; k++) {
      const mesh = meshRefs.current[k];
      if (!mesh) continue;
      // Evenly spaced phases → as one packet arrives, the next departs.
      const t = (base + k / PACKETS_PER_EDGE) % 1;
      mesh.position.copy(from).addScaledVector(dir, t);
      mesh.quaternion.copy(quaternion);

      // Tiny ease over the first/last 3% only, so packets run right up to the
      // node and into the panel — they read as connected end to end.
      const fade = Math.min(1, t / 0.03, (1 - t) / 0.03);
      mesh.scale.setScalar(size);
      const material = mesh.material as MeshBasicMaterial;
      material.opacity = Math.max(0, fade);
    }
  });

  return (
    <>
      {Array.from({ length: PACKETS_PER_EDGE }, (_, k) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-size packet set per edge
          key={k}
          renderOrder={1}
          ref={(el) => {
            meshRefs.current[k] = el;
          }}
        >
          <capsuleGeometry args={[0.018, 0.06, 4, 8]} />
          {/* toneMapped=false + additive so packets glow against the dark hero. */}
          <meshBasicMaterial color={edge.color} transparent toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

export function DataPulses({ edges }: { edges: ResolvedEdge[] }) {
  return (
    <>
      {edges.map((edge, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: deterministic static set built once at mount
        <EdgePackets key={i} edge={edge} />
      ))}
    </>
  );
}
