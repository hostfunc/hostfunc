import type { ExecutorBackend } from "../src/backend.js";
export interface ConformanceOptions {
  name: string;
  factory: () => ExecutorBackend | Promise<ExecutorBackend>;
}
export declare function runExecutorConformance(opts: ConformanceOptions): void;
//# sourceMappingURL=conformance.d.ts.map
