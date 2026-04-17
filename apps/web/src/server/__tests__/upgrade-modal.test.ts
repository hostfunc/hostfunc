import assert from "node:assert/strict";
import test from "node:test";
import { isQuotaLimitError } from "../../lib/upgrade-modal";

test("isQuotaLimitError matches monthly wall-time quota failures", () => {
  assert.equal(isQuotaLimitError("monthly_wall_time_limit_exceeded"), true);
  assert.equal(isQuotaLimitError('{"error":"monthly_wall_time_limit_exceeded"}'), true);
});

test("isQuotaLimitError matches daily execution quota failures", () => {
  assert.equal(isQuotaLimitError("daily_execution_limit_exceeded"), true);
});

test("isQuotaLimitError ignores unrelated failures", () => {
  assert.equal(isQuotaLimitError("invalid_json_payload"), false);
});
