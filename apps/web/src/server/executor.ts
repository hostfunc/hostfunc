import "server-only";

import { CloudflareExecutor } from "@hostfunc/executor-cloudflare";
import { LocalExecutor, type ExecutorBackend } from "@hostfunc/executor-core";
import { env } from "@/lib/env";

declare global {
  var __hostfunc_executor__: ExecutorBackend | undefined;
}

function build(): ExecutorBackend {
  const shouldUseLocal =
    env.HOSTFUNC_EXECUTOR === "local" ||
    (env.HOSTFUNC_EXECUTOR === "auto" && (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN));
  if (shouldUseLocal) return new LocalExecutor();

  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    throw new Error("Cloudflare executor selected but CF credentials are missing");
  }

  return new CloudflareExecutor({
    accountId: env.CF_ACCOUNT_ID,
    apiToken: env.CF_API_TOKEN,
    useWfp: env.HOSTFUNC_USE_WFP,
    namespace: env.CF_DISPATCH_NAMESPACE,
    runtimeBaseUrl: env.HOSTFUNC_RUNTIME_URL,
    ...(env.CF_FN_INDEX_KV_ID ? { fnIndexKvId: env.CF_FN_INDEX_KV_ID } : {}),
  });
}

export const executor: ExecutorBackend = globalThis.__hostfunc_executor__ ?? build();

if (process.env.NODE_ENV !== "production") {
  globalThis.__hostfunc_executor__ = executor;
}
