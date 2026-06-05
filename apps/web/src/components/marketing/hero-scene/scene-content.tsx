"use client";

import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { type ReactNode, Suspense, useMemo, useRef } from "react";
import type { Group } from "three";

import { AgentRobot } from "./agent-robot";
import { DataPulses } from "./data-pulses";
import { FloatingAgent } from "./floating-agent";
import { FloatingEditor } from "./floating-editor";
import { FloatingTerminal } from "./floating-terminal";
import { FunctionNodes } from "./function-nodes";
import { NetworkEdges } from "./network-edges";
import { HERO_SCENE, type ResolvedEdge, buildHubEdges, hubById } from "./scene-graph";
import { SceneLabel } from "./scene-label";
import type { DeviceTier } from "./use-device-tier";
import { usePointerParallax } from "./use-pointer-parallax";

/** The agent sits in the middle of the scene; the three panels feed into it. */
const AGENT_POS: readonly [number, number, number] = [0, 0.1, 0.2];

/** All wiring/packets render on this plane — behind every solid (clouds at
 *  z≈-2, panels at z≈-1.3, core at z≈-0.6) so nothing is ever drawn over. */
const WIRE_Z = -2.7;

/** Flatten an edge onto the back wiring plane, keeping its x/y endpoints. */
function onBackPlane(edge: ResolvedEdge): ResolvedEdge {
  return {
    ...edge,
    from: [edge.from[0], edge.from[1], WIRE_Z],
    to: [edge.to[0], edge.to[1], WIRE_Z],
  };
}

/** Rig that drifts the whole scene toward the cursor + a slow autonomous orbit. */
function ParallaxRig({ children }: { children: ReactNode }) {
  const groupRef = useRef<Group>(null);
  const pointer = usePointerParallax();

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const k = 1 - 0.0001 ** delta; // frame-rate-independent damping
    const t = state.clock.elapsedTime;

    const targetRotY = pointer.current.x * 0.18 + Math.sin(t * 0.08) * 0.05;
    const targetRotX = -pointer.current.y * 0.12;
    group.rotation.y += (targetRotY - group.rotation.y) * k;
    group.rotation.x += (targetRotX - group.rotation.x) * k;
    group.position.x += (pointer.current.x * 0.3 - group.position.x) * k;
    group.position.y += (-pointer.current.y * 0.2 - group.position.y) * k;
  });

  return <group ref={groupRef}>{children}</group>;
}

export function SceneContent({ tier }: { tier: Exclude<DeviceTier, "static"> }) {
  const edges = useMemo(() => buildHubEdges(HERO_SCENE).map(onBackPlane), []);

  // Panel → agent-core uplinks: each panel streams up into the orchestrator.
  const coreEdges = useMemo<ResolvedEdge[]>(
    () =>
      HERO_SCENE.hubs.map((h) =>
        onBackPlane({
          from: h.position,
          to: AGENT_POS,
          color: "#e8a317",
          weight: 1,
          ephemeral: false,
        }),
      ),
    [],
  );

  // Glass refraction only on the full tier; reduced still shows the panels.
  const glass = tier === "full";
  const ide = hubById(HERO_SCENE, "ide");
  const terminal = hubById(HERO_SCENE, "terminal");
  const agent = hubById(HERO_SCENE, "agent");

  return (
    <>
      {/* Image-based lighting so the robot's metal reads well (full tier only). */}
      {glass ? (
        <Suspense fallback={null}>
          <Environment preset="city" environmentIntensity={0.35} />
        </Suspense>
      ) : null}
      <ParallaxRig>
        <NetworkEdges edges={edges} />
        <DataPulses edges={edges} />
        <NetworkEdges edges={coreEdges} />
        <DataPulses edges={coreEdges} />
        <Suspense fallback={null}>
          <AgentRobot position={AGENT_POS} />
        </Suspense>
        <FunctionNodes nodes={HERO_SCENE.nodes} />
        {ide ? (
          <FloatingEditor position={ide.position} rotation={ide.rotation} glass={glass} animated />
        ) : null}
        {terminal ? (
          <FloatingTerminal
            position={terminal.position}
            rotation={terminal.rotation}
            glass={glass}
            animated
          />
        ) : null}
        {agent ? (
          <FloatingAgent
            position={agent.position}
            rotation={agent.rotation}
            glass={glass}
            animated
          />
        ) : null}

        {/* On-brand 3D labels */}
        {ide ? (
          <SceneLabel
            position={[ide.position[0], -0.75, ide.position[2]]}
            size={0.2}
            letterSpacing={0.3}
            anchorY="top"
          >
            IDE
          </SceneLabel>
        ) : null}
        {agent ? (
          <SceneLabel
            position={[agent.position[0], -0.55, agent.position[2]]}
            size={0.2}
            letterSpacing={0.3}
            anchorY="top"
          >
            AGENT
          </SceneLabel>
        ) : null}
        {terminal ? (
          <SceneLabel
            position={[terminal.position[0], -1.5, terminal.position[2]]}
            size={0.2}
            letterSpacing={0.3}
            anchorY="bottom"
          >
            TERMINAL
          </SceneLabel>
        ) : null}
        <SceneLabel
          position={[AGENT_POS[0], -0.55, AGENT_POS[2] + 0.3]}
          size={0.26}
          color="#fafaf6"
          letterSpacing={0.18}
          anchorY="top"
        >
          claude
        </SceneLabel>
      </ParallaxRig>
    </>
  );
}
