import assert from "node:assert/strict";
import test from "node:test";
import {
  type JsonToken,
  formatLogsAsText,
  matchesLogFilter,
  tokenizeJson,
} from "../../lib/log-format";

function render(tokens: JsonToken[]): string {
  return tokens.map((token) => token.text).join("");
}

test("tokenizeJson reproduces JSON.stringify pretty-printing for nested structures", () => {
  const value = {
    request: { method: "POST", retries: 3, ok: true },
    tags: ["alpha", "beta", { nested: null }],
    empty: {},
    none: [],
  };
  assert.equal(render(tokenizeJson(value)), JSON.stringify(value, null, 2));
});

test("tokenizeJson tags keys, strings, numbers, booleans, and null with their kinds", () => {
  const tokens = tokenizeJson({ msg: "hello", count: 3.5, ok: false, missing: null });
  const byText = new Map(tokens.map((token) => [token.text, token.kind]));
  assert.equal(byText.get('"msg"'), "key");
  assert.equal(byText.get('"hello"'), "string");
  assert.equal(byText.get("3.5"), "number");
  assert.equal(byText.get("false"), "boolean");
  assert.equal(byText.get("null"), "null");
});

test("tokenizeJson escapes strings containing quotes", () => {
  const tokens = tokenizeJson('she said "hi"');
  assert.deepEqual(tokens, [{ text: '"she said \\"hi\\""', kind: "string" }]);
  const nested = tokenizeJson({ quote: 'a "b" c' });
  assert.equal(render(nested), JSON.stringify({ quote: 'a "b" c' }, null, 2));
});

test("tokenizeJson handles top-level arrays and scalar values", () => {
  assert.equal(
    render(tokenizeJson([1, -2, true, null])),
    JSON.stringify([1, -2, true, null], null, 2),
  );
  assert.deepEqual(tokenizeJson(42), [{ text: "42", kind: "number" }]);
  assert.deepEqual(tokenizeJson(true), [{ text: "true", kind: "boolean" }]);
  assert.deepEqual(tokenizeJson(null), [{ text: "null", kind: "null" }]);
  assert.deepEqual(tokenizeJson([]), [{ text: "[]", kind: "punct" }]);
  assert.deepEqual(tokenizeJson({}), [{ text: "{}", kind: "punct" }]);
});

test("tokenizeJson orders tokens so keys precede their values", () => {
  const tokens = tokenizeJson({ a: [1] });
  const keyIndex = tokens.findIndex((token) => token.kind === "key");
  const numberIndex = tokens.findIndex((token) => token.kind === "number");
  assert.ok(keyIndex >= 0);
  assert.ok(numberIndex > keyIndex);
});

test("matchesLogFilter enforces level membership", () => {
  const line = { level: "warn", message: "disk almost full" };
  assert.equal(matchesLogFilter(line, { levels: ["warn", "error"] }), true);
  assert.equal(matchesLogFilter(line, { levels: ["debug", "info"] }), false);
  assert.equal(matchesLogFilter(line, { levels: [] }), false);
  assert.equal(matchesLogFilter(line, {}), true);
});

test("matchesLogFilter matches queries case-insensitively", () => {
  const line = { level: "info", message: "User SIGNED in from Berlin" };
  assert.equal(matchesLogFilter(line, { query: "signed" }), true);
  assert.equal(matchesLogFilter(line, { query: "BERLIN" }), true);
  assert.equal(matchesLogFilter(line, { query: "logout" }), false);
  assert.equal(matchesLogFilter(line, { query: "   " }), true);
});

test("matchesLogFilter combines levels and query", () => {
  const line = { level: "error", message: "boom" };
  assert.equal(matchesLogFilter(line, { levels: ["error"], query: "BOOM" }), true);
  assert.equal(matchesLogFilter(line, { levels: ["info"], query: "boom" }), false);
  assert.equal(matchesLogFilter(line, { levels: ["error"], query: "quiet" }), false);
});

test("formatLogsAsText renders `[iso ts] LEVEL message` per line", () => {
  const text = formatLogsAsText([
    { ts: "2026-07-06T10:00:00.000Z", level: "info", message: "started" },
    { ts: new Date("2026-07-06T10:00:01.000Z"), level: "error", message: "failed" },
  ]);
  assert.equal(
    text,
    "[2026-07-06T10:00:00.000Z] INFO started\n[2026-07-06T10:00:01.000Z] ERROR failed",
  );
});

test("formatLogsAsText appends JSON fields on the next line when present", () => {
  const text = formatLogsAsText([
    { ts: "2026-07-06T10:00:00.000Z", level: "warn", message: "slow", fields: { ms: 1200 } },
    { ts: "2026-07-06T10:00:01.000Z", level: "info", message: "done", fields: null },
  ]);
  const lines = text.split("\n");
  assert.equal(lines[0], "[2026-07-06T10:00:00.000Z] WARN slow");
  assert.equal(lines[1], "{");
  assert.equal(lines[2], '  "ms": 1200');
  assert.equal(lines[3], "}");
  assert.equal(lines[4], "[2026-07-06T10:00:01.000Z] INFO done");
});
