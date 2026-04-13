import "server-only";

import { CloudflareExecutor } from "@hostfunc/executor-cloudflare";
import type { ExecutorBackend } from "@hostfunc/executor-core";
import { env } from "@/lib/env";

declare global {
  var __hostfunc_executor__: ExecutorBackend | undefined;
}

function build(): ExecutorBackend {
  return new CloudflareExecutor({
    accountId: env.CF_ACCOUNT_ID,
    apiToken: env.CF_API_TOKEN,
    useWfp: env.HOSTFUNC_USE_WFP,
    namespace: env.CF_DISPATCH_NAMESPACE,
    runtimeBaseUrl: env.HOSTFUNC_RUNTIME_URL,
  });
}

export const executor: ExecutorBackend = globalThis.__hostfunc_executor__ ?? build();

if (process.env.NODE_ENV !== "production") {
  globalThis.__hostfunc_executor__ = executor;
}
