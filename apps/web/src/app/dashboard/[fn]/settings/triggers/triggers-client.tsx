"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TriggerConfig } from "@hostfunc/db";
import { useMemo, useState, useTransition } from "react";
import {
  removeTrigger,
  saveCronTrigger,
  saveEmailTrigger,
  saveHttpTrigger,
  saveMcpTrigger,
  setTriggerEnabled,
} from "./actions";

interface TriggerRow {
  kind: "http" | "cron" | "email" | "mcp";
  enabled: boolean;
  config: TriggerConfig;
}

export function TriggersClient({ fnId, triggers }: { fnId: string; triggers: TriggerRow[] }) {
  const [pending, startTransition] = useTransition();
  const byKind = useMemo(
    () => ({
      http: triggers.find((t) => t.kind === "http"),
      cron: triggers.find((t) => t.kind === "cron"),
      email: triggers.find((t) => t.kind === "email"),
      mcp: triggers.find((t) => t.kind === "mcp"),
    }),
    [triggers],
  );

  const [requireAuth, setRequireAuth] = useState(byKind.http?.config.http?.requireAuth ? "true" : "false");
  const [cronSchedule, setCronSchedule] = useState(byKind.cron?.config.cron?.schedule ?? "*/5 * * * *");
  const [cronTimezone, setCronTimezone] = useState(byKind.cron?.config.cron?.timezone ?? "UTC");
  const [emailAddress, setEmailAddress] = useState(byKind.email?.config.email?.address ?? "");
  const [emailAllowlist, setEmailAllowlist] = useState(
    (byKind.email?.config.email?.allowlist ?? []).join(", "),
  );
  const [mcpToolName, setMcpToolName] = useState(byKind.mcp?.config.mcp?.toolName ?? "");
  const [mcpDescription, setMcpDescription] = useState(byKind.mcp?.config.mcp?.description ?? "");

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border p-4 space-y-2">
        <h4 className="font-medium">HTTP trigger</h4>
        <p className="text-sm text-muted-foreground">
          Public runtime URL is always available. Set requireAuth for future edge auth enforcement.
        </p>
        <div className="flex gap-2">
          <Input value={requireAuth} onChange={(e) => setRequireAuth(e.target.value)} />
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(() => saveHttpTrigger({ fnId, requireAuth: requireAuth === "true" }))
            }
          >
            Save HTTP
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4 space-y-2">
        <h4 className="font-medium">Cron trigger</h4>
        <div className="flex gap-2">
          <Input value={cronSchedule} onChange={(e) => setCronSchedule(e.target.value)} placeholder="schedule" />
          <Input value={cronTimezone} onChange={(e) => setCronTimezone(e.target.value)} placeholder="timezone" />
        </div>
        <div className="flex gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                saveCronTrigger({
                  fnId,
                  schedule: cronSchedule,
                  timezone: cronTimezone || undefined,
                  enabled: byKind.cron?.enabled ?? true,
                }),
              )
            }
          >
            Save Cron
          </Button>
          {byKind.cron ? (
            <>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(() => setTriggerEnabled(fnId, "cron", !byKind.cron?.enabled))
                }
              >
                {byKind.cron.enabled ? "Disable" : "Enable"}
              </Button>
              <Button variant="outline" disabled={pending} onClick={() => startTransition(() => removeTrigger(fnId, "cron"))}>
                Remove
              </Button>
            </>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-border p-4 space-y-2">
        <h4 className="font-medium">Email trigger</h4>
        <Input value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="inbound address" />
        <Input
          value={emailAllowlist}
          onChange={(e) => setEmailAllowlist(e.target.value)}
          placeholder="allowlist emails comma-separated"
        />
        <div className="flex gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                saveEmailTrigger({
                  fnId,
                  address: emailAddress,
                  allowlist: emailAllowlist
                    .split(",")
                    .map((value: string) => value.trim())
                    .filter(Boolean),
                  enabled: byKind.email?.enabled ?? true,
                }),
              )
            }
          >
            Save Email
          </Button>
          {byKind.email ? (
            <>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(() => setTriggerEnabled(fnId, "email", !byKind.email?.enabled))
                }
              >
                {byKind.email.enabled ? "Disable" : "Enable"}
              </Button>
              <Button variant="outline" disabled={pending} onClick={() => startTransition(() => removeTrigger(fnId, "email"))}>
                Remove
              </Button>
            </>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-border p-4 space-y-2">
        <h4 className="font-medium">MCP trigger metadata</h4>
        <Input value={mcpToolName} onChange={(e) => setMcpToolName(e.target.value)} placeholder="tool name" />
        <Input value={mcpDescription} onChange={(e) => setMcpDescription(e.target.value)} placeholder="description" />
        <div className="flex gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                saveMcpTrigger({
                  fnId,
                  toolName: mcpToolName,
                  description: mcpDescription,
                  enabled: byKind.mcp?.enabled ?? true,
                }),
              )
            }
          >
            Save MCP
          </Button>
          {byKind.mcp ? (
            <>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(() => setTriggerEnabled(fnId, "mcp", !byKind.mcp?.enabled))
                }
              >
                {byKind.mcp.enabled ? "Disable" : "Enable"}
              </Button>
              <Button variant="outline" disabled={pending} onClick={() => startTransition(() => removeTrigger(fnId, "mcp"))}>
                Remove
              </Button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
