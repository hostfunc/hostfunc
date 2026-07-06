/**
 * Pure log-formatting helpers shared by the log viewer UI and its tests.
 * No React, no server imports — keep this module framework-free.
 */

export type JsonTokenKind = "key" | "string" | "number" | "boolean" | "null" | "punct";

export interface JsonToken {
  text: string;
  kind: JsonTokenKind;
}

/**
 * Pretty-prints a JSON-serializable value with 2-space indent and returns an
 * ordered token list for syntax highlighting. Joining every token's `text`
 * reproduces `JSON.stringify(value, null, 2)` for JSON-clean inputs.
 */
export function tokenizeJson(value: unknown): JsonToken[] {
  const tokens: JsonToken[] = [];
  emitValue(value, 0, tokens);
  return tokens;
}

function indent(depth: number): string {
  return "  ".repeat(depth);
}

function emitValue(value: unknown, depth: number, tokens: JsonToken[]): void {
  if (value === null || value === undefined) {
    tokens.push({ text: "null", kind: "null" });
    return;
  }
  switch (typeof value) {
    case "string":
      tokens.push({ text: JSON.stringify(value), kind: "string" });
      return;
    case "number":
      if (Number.isFinite(value)) {
        tokens.push({ text: String(value), kind: "number" });
      } else {
        // JSON.stringify renders NaN/Infinity as null.
        tokens.push({ text: "null", kind: "null" });
      }
      return;
    case "boolean":
      tokens.push({ text: value ? "true" : "false", kind: "boolean" });
      return;
    case "bigint":
      tokens.push({ text: String(value), kind: "number" });
      return;
    case "object":
      break;
    default:
      // functions, symbols — JSON.stringify would drop these; render as null.
      tokens.push({ text: "null", kind: "null" });
      return;
  }
  const withToJson = value as { toJSON?: unknown };
  if (typeof withToJson.toJSON === "function") {
    emitValue((withToJson as { toJSON: () => unknown }).toJSON(), depth, tokens);
    return;
  }
  if (Array.isArray(value)) {
    emitArray(value, depth, tokens);
    return;
  }
  emitObject(value as Record<string, unknown>, depth, tokens);
}

function emitArray(items: unknown[], depth: number, tokens: JsonToken[]): void {
  if (items.length === 0) {
    tokens.push({ text: "[]", kind: "punct" });
    return;
  }
  tokens.push({ text: "[", kind: "punct" });
  items.forEach((item, index) => {
    tokens.push({ text: `\n${indent(depth + 1)}`, kind: "punct" });
    emitValue(item, depth + 1, tokens);
    if (index < items.length - 1) tokens.push({ text: ",", kind: "punct" });
  });
  tokens.push({ text: `\n${indent(depth)}]`, kind: "punct" });
}

function emitObject(obj: Record<string, unknown>, depth: number, tokens: JsonToken[]): void {
  // Mirror JSON.stringify: entries whose value would be dropped are skipped.
  const entries = Object.entries(obj).filter(
    ([, v]) => v !== undefined && typeof v !== "function" && typeof v !== "symbol",
  );
  if (entries.length === 0) {
    tokens.push({ text: "{}", kind: "punct" });
    return;
  }
  tokens.push({ text: "{", kind: "punct" });
  entries.forEach(([key, entryValue], index) => {
    tokens.push({ text: `\n${indent(depth + 1)}`, kind: "punct" });
    tokens.push({ text: JSON.stringify(key), kind: "key" });
    tokens.push({ text: ": ", kind: "punct" });
    emitValue(entryValue, depth + 1, tokens);
    if (index < entries.length - 1) tokens.push({ text: ",", kind: "punct" });
  });
  tokens.push({ text: `\n${indent(depth)}}`, kind: "punct" });
}

export interface LogFilterOptions {
  /** When provided, the line's level must be a member. An empty array matches nothing. */
  levels?: string[];
  /** Case-insensitive substring match against the message. */
  query?: string;
}

export function matchesLogFilter(
  line: { level: string; message: string },
  opts: LogFilterOptions,
): boolean {
  if (opts.levels && !opts.levels.includes(line.level)) return false;
  const query = opts.query?.trim().toLowerCase();
  if (query && !line.message.toLowerCase().includes(query)) return false;
  return true;
}

export interface ExportableLogLine {
  ts: string | Date;
  level: string;
  message: string;
  fields?: unknown;
}

/**
 * Plain-text export: `[iso ts] LEVEL message`, with pretty-printed JSON fields
 * on the following line when present.
 */
export function formatLogsAsText(lines: ExportableLogLine[]): string {
  return lines
    .map((line) => {
      const iso = typeof line.ts === "string" ? line.ts : line.ts.toISOString();
      const head = `[${iso}] ${line.level.toUpperCase()} ${line.message}`;
      if (line.fields === null || line.fields === undefined) return head;
      return `${head}\n${JSON.stringify(line.fields, null, 2)}`;
    })
    .join("\n");
}
