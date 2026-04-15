"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const NODE_COUNT = 14;
const RADIUS = 3.2;

interface NodeDef {
  position: [number, number, number];
  scale: number;
  color: string;
  rotationSpeed: number;
}

interface EdgeDef {
  from: number;
  to: number;
  weight: number;
}

function HexagonNode({ node }: { node: NodeDef }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y += node.rotationSpeed;
    // Gentle bobbing
    ref.current.position.y =
      node.position[1] + Math.sin(state.clock.elapsedTime * 0.8 + node.position[0]) * 0.04;
  });

  return (
    <mesh ref={ref} position={node.position} scale={node.scale}>
      <cylinderGeometry args={[0.34, 0.34, 0.06, 6]} />
      <meshStandardMaterial
        color={node.color}
        emissive={node.color}
        emissiveIntensity={1.4}
        roughness={0.3}
        metalness={0.6}
      />
    </mesh>
  );
}

function Network({ nodes, edges }: { nodes: NodeDef[]; edges: EdgeDef[] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.06;
    groupRef.current.rotation.x = Math.sin(t * 0.15) * 0.18;
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => (
        <HexagonNode key={i} node={node} />
      ))}
      {edges.map(({ from, to, weight }, i) => (
        <Line
          key={i}
          points={[nodes[from]!.position, nodes[to]!.position]}
          color="#e8a317"
          lineWidth={weight * 1.4}
          transparent
          opacity={0.18 + weight * 0.18}
        />
      ))}
    </group>
  );
}

function buildNetwork(): { nodes: NodeDef[]; edges: EdgeDef[] } {
  const nodes: NodeDef[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle

  for (let i = 0; i < NODE_COUNT; i++) {
    const y = 1 - (i / (NODE_COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;

    nodes.push({
      position: [x * RADIUS, y * RADIUS * 0.55, z * RADIUS],
      scale: 0.85 + Math.random() * 0.45,
      // 80% amber, 20% cool sky blue for visual variety
      color: Math.random() < 0.8 ? "#e8a317" : "#7dd3fc",
      rotationSpeed: 0.005 + Math.random() * 0.006,
    });
  }

  // Edges: each node connects to its 2 nearest neighbors
  const edges: EdgeDef[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const distances = nodes
      .map((n, j) => ({
        j,
        d:
          (n.position[0] - nodes[i]!.position[0]) ** 2 +
          (n.position[1] - nodes[i]!.position[1]) ** 2 +
          (n.position[2] - nodes[i]!.position[2]) ** 2,
      }))
      .filter((x) => x.j !== i)
      .sort((a, b) => a.d - b.d);

    for (const { j, d } of distances.slice(0, 2)) {
      // Avoid duplicates
      if (edges.some((e) => (e.from === i && e.to === j) || (e.from === j && e.to === i))) continue;
      edges.push({ from: i, to: j, weight: Math.max(0.3, 1 - d / (RADIUS * RADIUS)) });
    }
  }

  return { nodes, edges };
}

export function HeroScene() {
  const network = useMemo(buildNetwork, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.18} />
      <directionalLight position={[6, 4, 5]} intensity={0.7} color="#fff7e8" />
      <directionalLight position={[-5, -3, -4]} intensity={0.25} color="#7dd3fc" />
      <Network nodes={network.nodes} edges={network.edges} />
      <EffectComposer>
        <Bloom
          intensity={0.95}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}