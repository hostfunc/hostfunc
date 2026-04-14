import "server-only";

import { env } from "@/lib/env";

const REQUIRED_SHARED_ENV = [
  "DATABASE_URL",
  "REDIS_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "SECRETS_MASTER_KEY",
  "EXEC_TOKEN_SECRET",
  "RUNTIME_LOOKUP_TOKEN",
  "RUNTIME_INGEST_TOKEN",
] as const;

export interface SetupState {
  complete: boolean;
  missing: string[];
  warnings: string[];
}

export function getSetupState(): SetupState {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_SHARED_ENV) {
    if (!process.env[key]) missing.push(key);
  }

  if (env.HOSTFUNC_EXECUTOR !== "local" && (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN)) {
    warnings.push("Cloudflare credentials are missing; local executor fallback is active.");
  }

  return {
    complete: missing.length === 0,
    missing,
    warnings,
  };
}
