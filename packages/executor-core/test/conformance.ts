import { afterAll, describe, expect, it } from "vitest";
import type { ExecutorBackend } from "../src/backend.js";

export interface ConformanceOptions {
  name: string;
  factory: () => ExecutorBackend | Promise<ExecutorBackend>;
  /** If false, skip the live deploy tests. Useful for CI without secrets. */
  liveDeploy?: boolean;
}

const SAMPLE_FN = `
export async function main(input) {
  const name = input?.name ?? "world";
  return { greeting: "hello, " + name };
}
`;

export function runExecutorConformance(opts: ConformanceOptions) {
  const liveDeploy = opts.liveDeploy ?? true;

  describe(`ExecutorBackend conformance: ${opts.name}`, () => {
    const deployedHandles: Array<{ fnId: string; versionId: string }> = [];

    afterAll(async () => {
      if (deployedHandles.length === 0) return;
      const backend = await opts.factory();
      for (const h of deployedHandles) {
        await backend.delete(h.fnId, h.versionId).catch(() => {});
      }
    });

    describe("backend basics", () => {
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

    describe.runIf(liveDeploy)("deploy", () => {
      it("deploys a valid bundle", async () => {
        const backend = await opts.factory();
        const fnId = `fn_test${Date.now().toString(36)}`;
        const versionId = `ver_${Date.now().toString(36)}`;
        deployedHandles.push({ fnId, versionId });

        const result = await backend.deploy({
          functionId: fnId,
          versionId,
          orgId: "org_test",
          bundle: {
            code: SAMPLE_FN,
            sizeBytes: SAMPLE_FN.length,
            sha256: "fake",
          },
          limits: {
            wallMs: 10_000,
            cpuMs: 1_000,
            memoryMb: 128,
            egressKb: 1024,
            subrequests: 20,
            maxCallDepth: 3,
          },
          secretRefs: [],
        });

        expect(result.versionId).toBe(versionId);
        expect(result.handle).toBeTruthy();
        expect(result.deployedAt).toBeTruthy();
      }, 30_000);

      it("rejects bundles that fail to compile", async () => {
        const backend = await opts.factory();
        const fnId = `fn_test${Date.now().toString(36)}_bad`;
        const versionId = `ver_${Date.now().toString(36)}_bad`;

        await expect(
          backend.deploy({
            functionId: fnId,
            versionId,
            orgId: "org_test",
            bundle: {
              code: "this is not valid typescript {{{",
              sizeBytes: 30,
              sha256: "fake",
            },
            limits: {
              wallMs: 10_000,
              cpuMs: 1_000,
              memoryMb: 128,
              egressKb: 1024,
              subrequests: 20,
              maxCallDepth: 3,
            },
            secretRefs: [],
          }),
        ).rejects.toThrow();
      }, 30_000);

      it.todo("rejects bundles over 1MB");
      it.todo("is idempotent on (functionId, versionId)");
    });

    // Everything below stays as it.todo until Component 5+
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
  });
}