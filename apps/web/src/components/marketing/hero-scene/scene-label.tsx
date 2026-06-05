"use client";

import { Text } from "@react-three/drei";

/**
 * On-brand 3D text label (JetBrains Mono, the mono used across the product UI).
 * Rendered inside the scene so it tilts/parallaxes with the 3D elements rather
 * than floating as a flat HTML overlay.
 */

const FONT = "/fonts/JetBrainsMono-Medium.ttf";

export function SceneLabel({
  position,
  children,
  size = 0.16,
  color = "#e8a317",
  letterSpacing = 0.02,
  anchorY = "middle",
}: {
  position: readonly [number, number, number];
  children: string;
  size?: number;
  color?: string;
  letterSpacing?: number;
  anchorY?: "top" | "middle" | "bottom";
}) {
  return (
    <Text
      font={FONT}
      position={position}
      fontSize={size}
      color={color}
      anchorX="center"
      anchorY={anchorY}
      letterSpacing={letterSpacing}
      outlineWidth="6%"
      outlineColor="#0a0908"
      outlineOpacity={0.85}
    >
      {children}
    </Text>
  );
}
