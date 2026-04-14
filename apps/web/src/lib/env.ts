import { z } from "zod";

const schema = z
  .object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
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
  HOSTFUNC_USE_WFP: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  HOSTFUNC_RUNTIME_URL: z.string().url(),
  RUNTIME_LOOKUP_TOKEN: z.string().min(1),
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
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
