import { runExecutorConformance } from "@hostfunc/executor-core/test";
import { CloudflareExecutor } from "../src/index.js";

const liveDeploy = Boolean(
  process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN,
);

runExecutorConformance({
  name: "cloudflare",
  liveDeploy,
  factory: () =>
    new CloudflareExecutor({
      accountId: process.env.CF_ACCOUNT_ID ?? "test",
      apiToken: process.env.CF_API_TOKEN ?? "test",
      useWfp: process.env.HOSTFUNC_USE_WFP !== "false",
      namespace: process.env.CF_DISPATCH_NAMESPACE ?? "hostfunc-dev",
    }),
});