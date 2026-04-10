import { describe, expect, it } from "vitest";
export function runExecutorConformance(opts) {
  describe(`ExecutorBackend conformance: ${opts.name}`, () => {
    describe("deploy", () => {
      it.todo("deploys a valid bundle");
      it.todo("rejects bundles over 1MB");
      it.todo("rejects malformed code");
      it.todo("is idempotent on (functionId, versionId)");
    });
    describe("execute", () => {
      it.todo("returns the function's return value");
      it.todo("maps a thrown error to FN_THREW");
      it.todo("enforces wall-time limit (FN_TIMEOUT_WALL)");
      it.todo("enforces CPU-time limit (FN_TIMEOUT_CPU)");
      it.todo("enforces memory limit (FN_OOM)");
      it.todo("enforces egress limit (FN_EGRESS_LIMIT)");
      it.todo("enforces subrequest limit (FN_SUBREQUEST_LIMIT)");
    });
    describe("secrets", () => {
      it.todo("makes secrets readable inside the function");
      it.todo("redacts secret values from logs");
      it.todo("throws when a required secret is missing");
    });
    describe("loop detection", () => {
      it.todo("rejects calls that exceed maxCallDepth");
    });
    describe("logs", () => {
      it.todo("captures console.log output");
      it.todo("preserves log ordering");
      it.todo("includes structured fields");
    });
    describe("metrics", () => {
      it.todo("reports wallMs and cpuMs");
      it.todo("reports memoryPeakMb and egressBytes");
    });
    describe("delete", () => {
      it.todo("removes the deployed version");
    });
    it("exposes a backend id", async () => {
      const backend = await opts.factory();
      expect(backend.id).toBeTruthy();
    });
    it("reports capabilities", async () => {
      const backend = await opts.factory();
      expect(backend.capabilities.maxWallMs).toBeGreaterThan(0);
      expect(backend.capabilities.maxMemoryMb).toBeGreaterThan(0);
    });
  });
}
//# sourceMappingURL=conformance.js.map
