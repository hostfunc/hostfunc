import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    /** Canonical public site origin — used as the metadataBase for social share tags. */
    NEXT_PUBLIC_SITE_URL: z.string().url().default("https://hostfunc.io"),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_INTEGRATIONS_CLIENT_ID: z.string().optional(),
    GITHUB_INTEGRATIONS_CLIENT_SECRET: z.string().optional(),
    GITHUB_INTEGRATIONS_REDIRECT_URI: z.string().url().optional(),
    GITHUB_OAUTH_SCOPES: z.string().optional(),
    GITHUB_OAUTH_REDIRECT_URI: z.string().url().optional(),
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_APP_SLUG: z.string().optional(),
    GITHUB_APP_CLIENT_ID: z.string().optional(),
    GITHUB_APP_CLIENT_SECRET: z.string().optional(),
    GITHUB_APP_PRIVATE_KEY: z.string().optional(),
    GITHUB_APP_WEBHOOK_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    /** Svix signing secret for the Resend Inbound webhook (custom-domain email). */
    RESEND_INBOUND_WEBHOOK_SECRET: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email(),
    REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
    SECRETS_MASTER_KEY: z
      .string()
      .min(44) // 32 bytes base64-encoded is 44 chars
      .describe("32 bytes, base64-encoded. Generate with: openssl rand -base64 32"),
    EXEC_TOKEN_SECRET: z
      .string()
      .min(44)
      .describe("32 bytes, base64-encoded. Generate with: openssl rand -base64 32"),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    CF_ACCOUNT_ID: z.string().min(1).optional(),
    CF_API_TOKEN: z.string().min(1).optional(),
    CF_DISPATCH_NAMESPACE: z.string().default("hostfunc-dev"),
    CF_FN_INDEX_KV_ID: z.string().optional(),
    CF_EGRESS_COUNTERS_KV_ID: z.string().optional(),
    CF_FN_ASSETS_KV_ID: z.string().optional(),
    // Cloudflare for SaaS (custom domains). Optional so dev/CI boot without it;
    // the feature is gated on CF_SAAS_ZONE_ID and the UI hides when unset.
    CF_SAAS_ZONE_ID: z.string().min(1).optional(),
    CF_SAAS_CNAME_TARGET: z.string().min(1).default("cname.hostfunc.io"),
    CF_SAAS_FALLBACK_ORIGIN: z.string().min(1).optional(),
    CF_DOMAIN_INDEX_KV_ID: z.string().optional(),
    HOSTFUNC_USE_WFP: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    HOSTFUNC_RUNTIME_URL: z.string().url(),
    RUNTIME_LOOKUP_TOKEN: z.string().min(1),
    /** Shared secret for control-plane → runtime /run (cron, email, CLI). Must match runtime worker env. */
    RUNTIME_INVOKE_TOKEN: z.string().min(1).default("dev-runtime-invoke-token"),
    RUNTIME_INGEST_TOKEN: z.string().min(1).default("dev-ingest-token"),
    TRIGGER_CONTROL_TOKEN: z.string().min(1).default("dev-trigger-token"),
    HOSTFUNC_MAIL_DOMAIN: z.string().default("mail.hostfunc.dev"),
    HOSTFUNC_EXECUTOR: z.enum(["auto", "cloudflare", "local"]).default("auto"),
    MCP_ALLOWED_ORIGINS: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    POSTHOG_API_KEY: z.string().optional(),
    POSTHOG_HOST: z.string().url().optional(),
    POSTHOG_PROJECT_ID: z.string().optional(),
    SENTRY_DSN: z.string().url().optional(),
    ALERT_WEBHOOK_URL: z.string().url().optional(),
    // Supabase Storage — backs workspace logo uploads. Optional so dev/CI boot
    // without it; the upload route returns a clean 503 when unset.
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_LOGO_BUCKET: z.string().min(1).default("workspace-logos"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;

    const mustBeHttps = [
      { key: "BETTER_AUTH_URL", value: value.BETTER_AUTH_URL },
      { key: "HOSTFUNC_RUNTIME_URL", value: value.HOSTFUNC_RUNTIME_URL },
    ];
    for (const item of mustBeHttps) {
      if (!item.value.startsWith("https://")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [item.key],
          message: "must use https in production",
        });
      }
    }

    const requiredSocial = [
      { key: "GOOGLE_CLIENT_ID", value: value.GOOGLE_CLIENT_ID },
      { key: "GOOGLE_CLIENT_SECRET", value: value.GOOGLE_CLIENT_SECRET },
      { key: "GITHUB_CLIENT_ID", value: value.GITHUB_CLIENT_ID },
      { key: "GITHUB_CLIENT_SECRET", value: value.GITHUB_CLIENT_SECRET },
    ];
    for (const item of requiredSocial) {
      if (!item.value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [item.key],
          message: "is required in production for social login",
        });
      }
    }

    // Refuse to boot if any internal service token still equals its dev default.
    // These tokens authenticate runtime/cron/email/tail workers against the control plane.
    const devTokenDefaults: Array<{ key: keyof typeof value; bad: string }> = [
      { key: "RUNTIME_INVOKE_TOKEN", bad: "dev-runtime-invoke-token" },
      { key: "RUNTIME_INGEST_TOKEN", bad: "dev-ingest-token" },
      { key: "TRIGGER_CONTROL_TOKEN", bad: "dev-trigger-token" },
    ];
    for (const item of devTokenDefaults) {
      if (value[item.key] === item.bad) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [item.key as string],
          message: `must be rotated from the dev default in production (generate via 'openssl rand -hex 32')`,
        });
      }
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
