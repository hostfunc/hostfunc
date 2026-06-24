import assert from "node:assert/strict";
import test from "node:test";
import { isProductionEnv } from "../../lib/env-target";

test("on Vercel, only VERCEL_ENV=production is treated as production", () => {
  // Every Vercel build runs with NODE_ENV=production; the deploy target is VERCEL_ENV.
  assert.equal(isProductionEnv({ NODE_ENV: "production", VERCEL_ENV: "production" }), true);
  assert.equal(isProductionEnv({ NODE_ENV: "production", VERCEL_ENV: "preview" }), false);
  assert.equal(isProductionEnv({ NODE_ENV: "production", VERCEL_ENV: "development" }), false);
});

test("off Vercel, falls back to NODE_ENV", () => {
  // CI prerender guard / self-hosted / local prod build: no VERCEL_ENV set.
  assert.equal(isProductionEnv({ NODE_ENV: "production" }), true);
  assert.equal(isProductionEnv({ NODE_ENV: "development" }), false);
  assert.equal(isProductionEnv({ NODE_ENV: "test" }), false);
  assert.equal(isProductionEnv({}), false);
});
