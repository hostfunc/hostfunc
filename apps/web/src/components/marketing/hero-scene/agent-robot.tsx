"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";

/**
 * The AI agent: the robot from the pmndrs "staging-and-camerashake" example
 * (three.js RobotExpressive, CC0). Plays its Idle clip and turns slowly. Sits at
 * the top of the hero as the orchestrator the panels stream up into.
 */

const MODEL = "/models/robot-draco.glb";

export function AgentRobot({
  position,
  scale = 0.6,
}: {
  position: readonly [number, number, number];
  scale?: number;
}) {
  const group = useRef<Group>(null);
  // drei auto-decodes Draco via its CDN decoder.
  const { scene, animations } = useGLTF(MODEL);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const idle = actions.Idle;
    idle?.reset().fadeIn(0.4).play();
    return () => void idle?.fadeOut(0.4);
  }, [actions]);

  // Look left and right while always facing forward (gentle yaw oscillation).
  useFrame((state) => {
    if (group.current) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.45;
  });

  return (
    <group ref={group} position={position} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL);
