import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND, LOGO_MARK_DATA_URI } from "./brand";

/** Standard Open Graph card dimensions — also what Twitter's large card uses. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";
export const OG_ALT = BRAND.title;

export interface OgImageOptions {
  /** Small uppercase label above the headline, e.g. "Documentation". */
  eyebrow?: string;
  /** Large headline. Defaults to the brand tagline. */
  title?: string;
  /** Supporting line under the headline. Defaults to the brand one-liner. */
  subtitle?: string;
}

const DEFAULT_SUBTITLE =
  "Write a single main() and deploy in seconds. Bundling, secrets, scheduling, and observability handled.";

/**
 * Render the hostfunc social share card (Open Graph + Twitter). Reads the mono
 * font from `public/fonts` via `process.cwd()`, so that file MUST ship with the
 * deployed app or this route 500s.
 */
export async function renderOgImage(options: OgImageOptions = {}): Promise<ImageResponse> {
  const eyebrow = options.eyebrow;
  const title = options.title ?? BRAND.tagline;
  const subtitle = options.subtitle ?? DEFAULT_SUBTITLE;
  const mono = await readFile(join(process.cwd(), "public/fonts/JetBrainsMono-Medium.ttf"));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "68px 72px",
        background: BRAND.ink,
        backgroundImage:
          "radial-gradient(1100px circle at 86% 8%, rgba(244,183,62,0.16), transparent 55%), radial-gradient(900px circle at 6% 96%, rgba(232,163,23,0.10), transparent 50%)",
        fontFamily: "JetBrains Mono",
        color: "#f5f5f4",
      }}
    >
      {/* Top: logo mark + wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <img src={LOGO_MARK_DATA_URI} width={88} height={88} alt="" />
        <div style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.02em" }}>{BRAND.name}</div>
      </div>

      {/* Middle: headline + tagline */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {eyebrow ? (
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: BRAND.amber,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            fontSize: 70,
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: "920px",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 30, color: BRAND.stone, maxWidth: "880px", lineHeight: 1.35 }}>
          {subtitle}
        </div>
      </div>

      {/* Footer: command + domain */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 28,
            color: BRAND.amberSoft,
          }}
        >
          <span style={{ color: "#57534e" }}>$</span>
          <span>hostfunc deploy</span>
        </div>
        <div style={{ fontSize: 28, color: "#78716c" }}>docs.hostfunc.io</div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [{ name: "JetBrains Mono", data: mono, weight: 500, style: "normal" }],
    },
  );
}
