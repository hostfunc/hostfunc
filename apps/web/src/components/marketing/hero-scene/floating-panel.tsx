"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

/**
 * Shared mechanics for the floating screens in the hero (IDE / terminal / agent).
 * Each panel is a refractive glass frame with a `CanvasTexture` "screen" drawn in
 * 2D. This module owns the mesh + texture plumbing; callers own what's drawn.
 */

export interface PanelTexture {
  texture: CanvasTexture;
  ctx: CanvasRenderingContext2D | null;
}

/**
 * Create an offscreen canvas + `CanvasTexture` for a panel screen, disposed on
 * unmount. The backing store is supersampled (`SS`×) and the 2D context is
 * pre-scaled, so callers draw in logical `width`×`height` coordinates but the
 * texture is rendered at high density — crisp text instead of pixelated.
 */
// Supersample factor. Kept modest — combined with max anisotropy it's sharp, and
// going higher (3–4×) blew up texture memory and triggered WebGL context loss.
const SS = 2.5;

export function useCanvasTexture(width: number, height: number): PanelTexture {
  // Max anisotropy keeps text crisp on the tilted panels.
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  const value = useMemo<PanelTexture>(() => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * SS);
    canvas.height = Math.round(height * SS);
    const ctx = canvas.getContext("2d");
    ctx?.scale(SS, SS);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    return { texture, ctx };
  }, [width, height, maxAnisotropy]);

  useEffect(() => () => value.texture.dispose(), [value]);
  return value;
}

/**
 * Reveal lines one at a time on a slow interval, looping back to the first.
 * Returns how many lines are currently visible.
 */
export function useRevealedLines(total: number, animated: boolean, intervalMs = 1600): number {
  const [visible, setVisible] = useState(animated ? 1 : total);
  useEffect(() => {
    if (!animated) return;
    const id = window.setInterval(() => {
      setVisible((v) => (v >= total ? 1 : v + 1));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [animated, total, intervalMs]);
  return visible;
}

export interface GlassPanelProps {
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  texture: CanvasTexture;
  /** Screen size in scene units; match the texture aspect to avoid distortion. */
  width: number;
  height: number;
  /** Refractive transmission glass (full tier) vs a cheap physical frame. */
  glass: boolean;
}

/** The 3D shell: a glass frame with a textured screen plane on its front face. */
export function GlassPanel({ position, rotation, texture, width, height, glass }: GlassPanelProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Opaque backing: writes depth so the node network *behind* the panel is
          occluded rather than showing through the transmission glass. */}
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[width + 0.16, height + 0.16]} />
        <meshBasicMaterial color="#0a0908" toneMapped={false} />
      </mesh>
      {/* Sleek dark frame. A cheap standard material — no transmission/FBO, so it
          can't trigger WebGL context loss the way glass refraction did. */}
      <mesh>
        <boxGeometry args={[width + 0.12, height + 0.12, 0.08]} />
        <meshStandardMaterial color="#15120f" roughness={glass ? 0.18 : 0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.061]}>
        <planeGeometry args={[width, height]} />
        {/* toneMapped=false keeps the screen bright. */}
        <meshBasicMaterial map={texture} toneMapped={false} transparent />
      </mesh>
    </group>
  );
}

/** Draw the macOS-style title bar (traffic-light dots + a label) common to all panels. */
export function drawTitleBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  label: string,
  labelColor = "#57534e",
): void {
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, 0, width, 38);
  const dots: Array<[string, number]> = [
    ["#f43f5e", 22],
    ["#f59e0b", 44],
    ["#10b981", 66],
  ];
  for (const [color, x] of dots) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, 19, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = labelColor;
  ctx.font = '13px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillText(label, 92, 24);
}
