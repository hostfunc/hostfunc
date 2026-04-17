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
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
        <h4 className="font-semibold text-[var(--color-bone)]">HTTP trigger</h4>
        <p className="text-sm text-[var(--color-bone-muted)]">
          Public runtime URL is always available. Set requireAuth for future edge auth enforcement.
        </p>
        <div className="flex gap-2">
          <Input
            value={requireAuth}
            onChange={(e) => setRequireAuth(e.target.value)}
            className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]"
          />
          <Button
            disabled={pending}
            className="h-11 rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            onClick={() =>
              startTransition(() => saveHttpTrigger({ fnId, requireAuth: requireAuth === "true" }))
            }
          >
            Save HTTP
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
        <h4 className="font-semibold text-[var(--color-bone)]">Cron trigger</h4>
        <div className="flex gap-2">
          <Input value={cronSchedule} onChange={(e) => setCronSchedule(e.target.value)} placeholder="schedule" className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]" />
          <Input value={cronTimezone} onChange={(e) => setCronTimezone(e.target.value)} placeholder="timezone" className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]" />
        </div>
        <div className="flex gap-2">
          <Button
            disabled={pending}
            className="h-11 rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
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
                className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                onClick={() =>
                  startTransition(() => setTriggerEnabled(fnId, "cron", !byKind.cron?.enabled))
                }
              >
                {byKind.cron.enabled ? "Disable" : "Enable"}
              </Button>
              <Button variant="outline" disabled={pending} className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]" onClick={() => startTransition(() => removeTrigger(fnId, "cron"))}>
                Remove
              </Button>
            </>
          ) : null}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
        <h4 className="font-semibold text-[var(--color-bone)]">Email trigger</h4>
        <Input value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="inbound address" className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]" />
        <Input
          value={emailAllowlist}
          onChange={(e) => setEmailAllowlist(e.target.value)}
          placeholder="allowlist emails comma-separated"
          className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]"
        />
        <div className="flex gap-2">
          <Button
            disabled={pending}
            className="h-11 rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
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
                className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                onClick={() =>
                  startTransition(() => setTriggerEnabled(fnId, "email", !byKind.email?.enabled))
                }
              >
                {byKind.email.enabled ? "Disable" : "Enable"}
              </Button>
              <Button variant="outline" disabled={pending} className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]" onClick={() => startTransition(() => removeTrigger(fnId, "email"))}>
                Remove
              </Button>
            </>
          ) : null}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
        <h4 className="font-semibold text-[var(--color-bone)]">MCP trigger metadata</h4>
        <Input value={mcpToolName} onChange={(e) => setMcpToolName(e.target.value)} placeholder="tool name" className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]" />
        <Input value={mcpDescription} onChange={(e) => setMcpDescription(e.target.value)} placeholder="description" className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]" />
        <div className="flex gap-2">
          <Button
            disabled={pending}
            className="h-11 rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
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
                className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                onClick={() =>
                  startTransition(() => setTriggerEnabled(fnId, "mcp", !byKind.mcp?.enabled))
                }
              >
                {byKind.mcp.enabled ? "Disable" : "Enable"}
              </Button>
              <Button variant="outline" disabled={pending} className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]" onClick={() => startTransition(() => removeTrigger(fnId, "mcp"))}>
                Remove
              </Button>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
