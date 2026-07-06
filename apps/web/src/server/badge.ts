/**
 * Pure helpers for the public status badge served at /api/badge/[org]/[fn].
 * Kept free of DB / server-only imports so they are unit-testable.
 */

export interface BadgeStats {
  /** Total executions in the window. */
  total: number;
  /** Executions with a non-ok status. */
  errors: number;
  /** p95 wall time in milliseconds. */
  p95WallMs: number;
}

export type BadgeColor = "green" | "amber" | "red" | "gray";

export interface BadgeValue {
  /** Right-segment text, e.g. "99.2% · 45ms" or "no runs". */
  text: string;
  color: BadgeColor;
}

const BADGE_HEX: Record<BadgeColor, string> = {
  green: "#3fb950",
  amber: "#d4a72c",
  red: "#f85149",
  gray: "#8b949e",
};

/** Escape text for safe interpolation into SVG/XML. */
export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Turn 24h execution stats into badge text + color.
 * Green ≥99% success, amber ≥95%, red below; gray "no runs" when idle.
 */
export function formatBadge({ total, errors, p95WallMs }: BadgeStats): BadgeValue {
  if (total <= 0) {
    return { text: "no runs", color: "gray" };
  }
  const successPct = ((total - errors) / total) * 100;
  // One decimal place; toString drops a trailing ".0" (100, not "100.0").
  const rounded = Math.round(successPct * 10) / 10;
  const color: BadgeColor = successPct >= 99 ? "green" : successPct >= 95 ? "amber" : "red";
  return { text: `${rounded}% · ${Math.round(p95WallMs)}ms`, color };
}

/** Approximate rendered width of badge text at font-size 11 Verdana. */
function segmentWidth(text: string): number {
  return Math.ceil(text.length * 6.5) + 12;
}

/**
 * Hand-rolled shields.io-style flat badge: gray label segment + colored
 * value segment. All interpolated text is XML-escaped.
 */
export function renderBadgeSvg(badge: BadgeValue, label = "hostfunc"): string {
  const labelWidth = segmentWidth(label);
  const valueWidth = segmentWidth(badge.text);
  const width = labelWidth + valueWidth;
  const fill = BADGE_HEX[badge.color];
  const safeLabel = escapeXml(label);
  const safeValue = escapeXml(badge.text);
  const aria = `${safeLabel}: ${safeValue}`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${aria}">`,
    `<title>${aria}</title>`,
    '<linearGradient id="s" x2="0" y2="100%">',
    '<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>',
    '<stop offset="1" stop-opacity=".1"/>',
    "</linearGradient>",
    `<clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>`,
    '<g clip-path="url(#r)">',
    `<rect width="${labelWidth}" height="20" fill="#555"/>`,
    `<rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${fill}"/>`,
    `<rect width="${width}" height="20" fill="url(#s)"/>`,
    "</g>",
    '<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">',
    `<text x="${labelWidth / 2}" y="14">${safeLabel}</text>`,
    `<text x="${labelWidth + valueWidth / 2}" y="14">${safeValue}</text>`,
    "</g>",
    "</svg>",
  ].join("");
}
