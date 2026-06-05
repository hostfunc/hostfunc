"use client";

import { useEffect } from "react";

import { GlassPanel, drawTitleBar, useCanvasTexture, useRevealedLines } from "./floating-panel";

const TEX_W = 512;
const TEX_H = 320;
const PANEL_W = 2.4;
const PANEL_H = (PANEL_W * TEX_H) / TEX_W;

type LineTone = "amber" | "emerald" | "muted" | "bone";

interface TerminalLine {
  text: string;
  tone: LineTone;
}

const TONE_COLOR: Record<LineTone, string> = {
  amber: "#e8a317",
  emerald: "#10b981",
  muted: "#a8a29e",
  bone: "#fafaf6",
};

/** A deploy → run session, revealed line by line then looped. */
const LOG: TerminalLine[] = [
  { text: "$ hostfunc deploy weather-digest", tone: "amber" },
  { text: "✓ bundled · 12 KB", tone: "emerald" },
  { text: "✓ live at /run/you/weather", tone: "emerald" },
  { text: "$ hostfunc run weather-digest", tone: "amber" },
  { text: "→ ai-summarize · 412ms", tone: "muted" },
  { text: '{ "summary": "Mild, 18°C…" }', tone: "bone" },
];

function draw(ctx: CanvasRenderingContext2D, visible: number) {
  ctx.fillStyle = "#0a0908";
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  drawTitleBar(ctx, TEX_W, "~/weather-digest — zsh");

  ctx.font = '15px "JetBrains Mono", ui-monospace, monospace';
  let y = 72;
  for (const line of LOG.slice(0, visible)) {
    ctx.fillStyle = TONE_COLOR[line.tone];
    ctx.fillText(line.text, 22, y);
    y += 27;
  }

  // Blinking-ish prompt caret on the latest line.
  ctx.fillStyle = "#e8a317";
  ctx.fillRect(22, y - 13, 9, 16);
}

export interface FloatingTerminalProps {
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  glass: boolean;
  animated: boolean;
}

/** The terminal surface: a CLI deploy/run session on a glass screen. */
export function FloatingTerminal({ position, rotation, glass, animated }: FloatingTerminalProps) {
  const { texture, ctx } = useCanvasTexture(TEX_W, TEX_H);
  const visible = useRevealedLines(LOG.length, animated);

  useEffect(() => {
    if (!ctx) return;
    draw(ctx, visible);
    texture.needsUpdate = true;
  }, [ctx, texture, visible]);

  return (
    <GlassPanel
      position={position}
      rotation={rotation}
      texture={texture}
      width={PANEL_W}
      height={PANEL_H}
      glass={glass}
    />
  );
}
