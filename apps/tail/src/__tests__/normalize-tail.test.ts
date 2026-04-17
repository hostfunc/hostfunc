import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTailPayload } from "../index";

test("normalizeTailPayload accepts direct execution payload", () => {
  const normalized = normalizeTailPayload({
    executionId: "exe_123",
    status: "ok",
    logs: [{ level: "info", message: "done" }],
  });
  assert.ok(normalized);
  assert.equal(normalized?.executionId, "exe_123");
  assert.equal(normalized?.source, "tail");
  assert.equal(normalized?.eventType, "tail_direct");
});

test("normalizeTailPayload accepts envelope payload", () => {
  const normalized = normalizeTailPayload({
    id: "evt_123",
    metadata: { executionId: "exe_222" },
    event: {
      timestamp: "2026-01-01T00:00:00.000Z",
      logs: [{ level: "warn", message: "warning" }],
    },
  });
  assert.ok(normalized);
  assert.equal(normalized?.executionId, "exe_222");
  assert.equal(normalized?.eventType, "tail_envelope");
  assert.equal(normalized?.logs?.[0]?.message, "warning");
});

