/**
 * Pure SVG safety checks for logo uploads. A logo SVG never legitimately
 * carries scripts or external references, so unsafe markup is rejected
 * outright rather than sanitized (no heavyweight sanitizer dependency).
 */

/** True when the text contains an `<svg ...>` document. */
export function isSvgDocument(text: string): boolean {
  return text.toLowerCase().includes("<svg");
}

/**
 * Non-fragment href/xlink:href. Internal references (`href="#gradient"`,
 * common in SVGO output) are permitted while http(s):, data:,
 * protocol-relative, and entity-obfuscated externals are blocked. The
 * alternation handles quoted and unquoted values without letting the engine
 * backtrack past an opening quote; the lookbehind avoids false positives on
 * attributes like `data-href`.
 */
const EXTERNAL_HREF = /(?<![\w-])(?:xlink:)?href\s*=\s*(?:["'](?!#)|(?!["'#]))/i;

/**
 * Returns a human-readable label of the first unsafe pattern found, or null
 * when the SVG is clean.
 */
export function findUnsafeSvgPattern(text: string): string | null {
  const lower = text.toLowerCase();
  const unsafe: Array<{ test: () => boolean; label: string }> = [
    { test: () => lower.includes("<script"), label: "embedded scripts" },
    { test: () => lower.includes("<foreignobject"), label: "foreign objects" },
    { test: () => lower.includes("javascript:"), label: "javascript: URIs" },
    { test: () => lower.includes("<!entity"), label: "XML entities" },
    { test: () => /\son[a-z]+\s*=/i.test(text), label: "event handlers" },
    { test: () => lower.includes("<image"), label: "embedded images" },
    { test: () => EXTERNAL_HREF.test(text), label: "external references" },
  ];
  for (const { test, label } of unsafe) {
    if (test()) return label;
  }
  return null;
}
