"use client";

import { useEffect } from "react";

import { GlassPanel, drawTitleBar, useCanvasTexture, useRevealedLines } from "./floating-panel";

const TEX_W = 512;
const TEX_H = 320;
const PANEL_W = 2.4;
const PANEL_H = (PANEL_W * TEX_H) / TEX_W;

type Role = "user" | "call" | "done" | "reply";

interface ChatLine {
  text: string;
  role: Role;
}

const ROLE_COLOR: Record<Role, string> = {
  user: "#a8a29e", // prompt (muted)
  call: "#e8a317", // tool call (amber)
  done: "#10b981", // result (emerald)
  reply: "#fafaf6", // assistant reply (bone)
};

const CHAT: ChatLine[] = [
  { text: "› summarize today's weather", role: "user" },
  { text: "→ calling weather-digest", role: "call" },
  { text: "→ calling ai-summarize", role: "call" },
  { text: "✓ done · 412ms", role: "done" },
  { text: "Mild, 18°C, clearing by noon.", role: "reply" },
];

function draw(ctx: CanvasRenderingContext2D, visible: number) {
  ctx.fillStyle = "#0a0908";
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  drawTitleBar(ctx, TEX_W, "claude — agent");

  // Cyan agent badge in the title bar.
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.arc(TEX_W - 26, 19, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '15px "JetBrains Mono", ui-monospace, monospace';
  let y = 74;
  for (const line of CHAT.slice(0, visible)) {
    // Lead glyph dot for tool calls/results.
    if (line.role === "call" || line.role === "done") {
      ctx.fillStyle = ROLE_COLOR[line.role];
      ctx.beginPath();
      ctx.arc(28, y - 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = ROLE_COLOR[line.role];
    const indent = line.role === "call" || line.role === "done" ? 42 : 22;
    ctx.fillText(line.text, indent, y);
    y += 30;
  }

  // Thinking caret while the next line is pending.
  if (visible < CHAT.length) {
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath();
    ctx.arc(28, y - 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export interface FloatingAgentProps {
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  glass: boolean;
  animated: boolean;
}

/** The agent surface: an AI orchestrating functions via tool calls. */
export function FloatingAgent({ position, rotation, glass, animated }: FloatingAgentProps) {
  const { texture, ctx } = useCanvasTexture(TEX_W, TEX_H);
  const visible = useRevealedLines(CHAT.length, animated);

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
