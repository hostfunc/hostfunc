"use client";

import { useEffect } from "react";

import { GlassPanel, drawTitleBar, useCanvasTexture, useRevealedLines } from "./floating-panel";

const TEX_W = 560;
const TEX_H = 360;
const PANEL_W = 3.0;
const PANEL_H = (PANEL_W * TEX_H) / TEX_W;

// Syntax palette.
const KW = "#c084fc"; // keyword (violet)
const FN = "#22d3ee"; // function / call (cyan)
const OBJ = "#e8a317"; // object / namespace (amber)
const STR = "#10b981"; // string (emerald)
const TXT = "#cbd5c0"; // plain identifier (bone)
const DIM = "#6b675f"; // comment / punctuation (muted)

type Seg = [text: string, color: string];

/** The `main()` users write — drawn as colored segments, revealed line by line. */
const CODE: Seg[][] = [
  [["// deploy in seconds", DIM]],
  [
    ["export ", KW],
    ["async ", KW],
    ["function ", KW],
    ["main", FN],
    ["(req) {", TXT],
  ],
  [
    ["  const data = ", TXT],
    ["await ", KW],
    ["weather", FN],
    ["(req)", TXT],
  ],
  [
    ["  const out = ", TXT],
    ["await ", KW],
    ["ai", OBJ],
    [".summarize", FN],
    ["(data)", TXT],
  ],
  [
    ["  return ", KW],
    ["{ out }", STR],
  ],
  [["}", TXT]],
];

const ACT_W = 34; // activity bar
const SIDE_W = 116; // file explorer
const EDIT_X = ACT_W + SIDE_W;
const GUTTER = 30;

function draw(ctx: CanvasRenderingContext2D, visible: number) {
  // Editor background.
  ctx.fillStyle = "#0b0a09";
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  drawTitleBar(ctx, TEX_W, "weather-digest — hostfunc");

  // Activity bar.
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(0, 38, ACT_W, TEX_H - 38);
  const icons: Array<[string, number]> = [
    ["#e8a317", 64],
    ["#57534e", 100],
    ["#57534e", 136],
  ];
  for (const [color, y] of icons) {
    ctx.fillStyle = color;
    ctx.fillRect(11, y, 13, 13);
  }

  // File explorer.
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(ACT_W, 38, SIDE_W, TEX_H - 38);
  ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = DIM;
  ctx.fillText("EXPLORER", ACT_W + 12, 58);
  const files: Array<[string, boolean]> = [
    ["▾ src", false],
    ["  main.ts", true],
    ["  weather.ts", false],
    ["  ai.ts", false],
  ];
  let fy = 82;
  for (const [name, active] of files) {
    if (active) {
      ctx.fillStyle = "rgba(232,163,23,0.12)";
      ctx.fillRect(ACT_W, fy - 12, SIDE_W, 18);
    }
    ctx.fillStyle = active ? "#e8a317" : "#a8a29e";
    ctx.fillText(name, ACT_W + 10, fy);
    fy += 22;
  }

  // Editor tab.
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(EDIT_X, 38, TEX_W - EDIT_X, 26);
  ctx.fillStyle = "#e8a317";
  ctx.fillRect(EDIT_X, 62, 78, 2);
  ctx.fillStyle = "#cbd5c0";
  ctx.font = '12px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillText("main.ts", EDIT_X + 14, 56);

  // Code, revealed line by line.
  ctx.font = '14px "JetBrains Mono", ui-monospace, monospace';
  const codeX = EDIT_X + GUTTER + 8;
  let y = 92;
  for (let i = 0; i < Math.min(visible, CODE.length); i++) {
    const line = CODE[i];
    if (!line) continue;
    // Gutter line number.
    ctx.fillStyle = DIM;
    ctx.textAlign = "right";
    ctx.fillText(String(i + 1), EDIT_X + GUTTER, y);
    ctx.textAlign = "left";
    // Segments.
    let x = codeX;
    for (const [text, color] of line) {
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      x += ctx.measureText(text).width;
    }
    y += 24;
  }
}

export interface FloatingEditorProps {
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  glass: boolean;
  animated: boolean;
}

/** The IDE surface: a VSCode-style editor showing the user's `main()`. */
export function FloatingEditor({ position, rotation, glass, animated }: FloatingEditorProps) {
  const { texture, ctx } = useCanvasTexture(TEX_W, TEX_H);
  const visible = useRevealedLines(CODE.length, animated, 900);

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
