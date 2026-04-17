import assert from "node:assert/strict";
import test from "node:test";
import { shouldBlockMonthlyWallUsage } from "../quota";

test("shouldBlockMonthlyWallUsage returns false when below plan limit", () => {
  assert.equal(shouldBlockMonthlyWallUsage(299_999, 300_000), false);
});

test("shouldBlockMonthlyWallUsage returns true when usage matches plan limit", () => {
  assert.equal(shouldBlockMonthlyWallUsage(300_000, 300_000), true);
});

test("shouldBlockMonthlyWallUsage returns true when usage exceeds plan limit", () => {
  assert.equal(shouldBlockMonthlyWallUsage(500_000, 300_000), true);
});
