import { runExecutorConformance } from "@hostfunc/executor-core/test";
import { CloudflareExecutor } from "../src/index.js";

runExecutorConformance({
  name: "cloudflare",
  factory: () => new CloudflareExecutor(),
});
