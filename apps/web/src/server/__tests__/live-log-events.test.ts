import assert from "node:assert/strict";
import test from "node:test";
import { clampBackfillLimit, toSseEvent, toStreamLine } from "../live-log-events";

test("toStreamLine returns stable log payload", () => {
  const row = toStreamLine({
    level: "info",
    message: "hello",
    fields: { source: "test" },
    ts: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(row.level, "info");
  assert.equal(row.message, "hello");
  assert.equal(row.ts, "2026-01-01T00:00:00.000Z");
  assert.deepEqual(row.fields, { source: "test" });
});

test("toSseEvent emits event payload envelope", () => {
  const sse = toSseEvent({ ok: true }, "ready");
  assert.ok(sse.includes("event: ready"));
  assert.ok(sse.includes('data: {"ok":true}'));
});

test("clampBackfillLimit defaults and bounds values", () => {
  assert.equal(clampBackfillLimit(undefined), 120);
  assert.equal(clampBackfillLimit("999"), 500);
  assert.equal(clampBackfillLimit("-10"), 0);
  assert.equal(clampBackfillLimit("25"), 25);
});

