"use client";

import { DataTexture, NearestFilter, RedFormat } from "three";

import type { NodeKind, SceneNode } from "./scene-graph";

/**
 * Function nodes drawn as small **cartoon clouds** (overlapping toon-shaded
 * puffs) to read as "cloud storage" the wires/packets stream into. Plain meshes
 * only — no drei `<Clouds>` / transmission — so the scene stays light on the GPU.
 */

// 3-band gradient → crisp cel shading on the toon material (shared by all puffs).
const TOON_GRADIENT = (() => {
  const data = new Uint8Array([150, 205, 255]);
  const tex = new DataTexture(data, data.length, 1, RedFormat);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

// Soft near-white tint per node kind.
const CLOUD_COLOR: Record<NodeKind, string> = {
  core: "#fdf3df", // warm white
  connector: "#e4f5ec", // mint white
  scratch: "#e2f1f8", // icy white
};

// Overlapping puffs forming a classic cartoon cloud silhouette (scaled per node).
const PUFFS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0.0, -0.02, 0.0, 0.34],
  [-0.3, -0.06, 0.02, 0.24],
  [0.3, -0.06, -0.02, 0.26],
  [-0.1, 0.16, 0.0, 0.22],
  [0.16, 0.12, 0.04, 0.2],
];
const CLOUD_SCALE = 0.58;

function CartoonCloud({ node }: { node: SceneNode }) {
  const color = CLOUD_COLOR[node.kind];
  return (
    <group position={node.position} scale={CLOUD_SCALE * node.scale}>
      {PUFFS.map((p, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed puff set per cloud
          key={i}
          position={[p[0], p[1], p[2]]}
        >
          <sphereGeometry args={[p[3], 16, 16]} />
          <meshToonMaterial
            color={color}
            gradientMap={TOON_GRADIENT}
            emissive={color}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

export function FunctionNodes({ nodes }: { nodes: SceneNode[] }) {
  return (
    <>
      {nodes.map((node) => (
        <CartoonCloud key={node.id} node={node} />
      ))}
    </>
  );
}
