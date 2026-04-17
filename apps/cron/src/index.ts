/// <reference types="@cloudflare/workers-types" />

interface Env {
  CONTROL_PLANE_URL: string;
  CONTROL_PLANE_TOKEN: string;
  HOSTFUNC_RUNTIME_URL: string;
  RUNTIME_INVOKE_TOKEN: string;
}

interface DueTrigger {
  triggerId: string;
  /** Preferred: organization slug. */
  orgSlug?: string;
  /** Legacy field for back-compat with older control-plane deployments. */
  owner?: string;
  slug: string;
  dedupeKey: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    if (event.cron === "0 0 * * *") {
      await runNightlyBillingUsageReport(env);
      return;
    }

    const dueRes = await fetch(`${env.CONTROL_PLANE_URL}/api/internal/cron/due`, {
      headers: { authorization: `Bearer ${env.CONTROL_PLANE_TOKEN}` },
    });
    if (!dueRes.ok) {
      console.error("[cron] due status", dueRes.status);
      return;
    }
    const payload = (await dueRes.json()) as { due?: DueTrigger[] };
    for (const row of payload.due ?? []) {
      const orgSlug = row.orgSlug ?? row.owner;
      if (!orgSlug) {
        await ack(env, {
          dedupeKey: row.dedupeKey,
          triggerId: row.triggerId,
          ok: false,
          error: "missing_org_slug",
        });
        continue;
      }
      try {
        const runRes = await fetch(`${env.HOSTFUNC_RUNTIME_URL}/run/${orgSlug}/${row.slug}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${env.RUNTIME_INVOKE_TOKEN}`,
          },
          body: JSON.stringify({
            hostfuncTriggerKind: "cron",
            trigger: "cron",
            dedupeKey: row.dedupeKey,
          }),
        });
        const ackInput: {
          dedupeKey: string;
          triggerId: string;
          executionId?: string | null;
          ok: boolean;
          error?: string;
        } = {
          dedupeKey: row.dedupeKey,
          triggerId: row.triggerId,
          ok: runRes.ok,
        };
        const executionId = runRes.headers.get("x-hostfunc-exec-id");
        if (executionId) ackInput.executionId = executionId;
        if (!runRes.ok) ackInput.error = `runtime_status_${runRes.status}`;
        await ack(env, {
          ...ackInput,
        });
      } catch (error) {
        await ack(env, {
          dedupeKey: row.dedupeKey,
          triggerId: row.triggerId,
          ok: false,
          error: error instanceof Error ? error.message : "dispatch_failed",
        });
      }
    }
  },
};

async function runNightlyBillingUsageReport(env: Env): Promise<void> {
  const reportRes = await fetch(`${env.CONTROL_PLANE_URL}/api/internal/billing/report-usage`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.CONTROL_PLANE_TOKEN}` },
  });
  if (!reportRes.ok) {
    console.error("[cron] billing usage report failed", reportRes.status);
  }
}

async function ack(
  env: Env,
  input: {
    dedupeKey: string;
    triggerId: string;
    executionId?: string | null;
    ok: boolean;
    error?: string;
  },
) {
  await fetch(`${env.CONTROL_PLANE_URL}/api/internal/cron/ack`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.CONTROL_PLANE_TOKEN}`,
    },
    body: JSON.stringify(input),
  });
}
