import type { ExecutorBackend } from "../src/backend.js";
export interface ConformanceOptions {
  name: string;
  factory: () => ExecutorBackend | Promise<ExecutorBackend>;
  /** If false, skip the live deploy tests. Useful for CI without secrets. */
  liveDeploy?: boolean;
}
export declare function runExecutorConformance(opts: ConformanceOptions): void;
//# sourceMappingURL=conformance.d.ts.map
