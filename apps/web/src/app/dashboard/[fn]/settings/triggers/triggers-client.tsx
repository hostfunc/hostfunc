"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TriggerConfig } from "@hostfunc/db";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
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

type TriggerKind = TriggerRow["kind"];

type FeedbackTone = "success" | "error";

type SectionFeedback = Record<
  TriggerKind,
  {
    tone: FeedbackTone;
    message: string;
  } | null
>;

const CRON_PRESETS = [
  { label: "Every 5 minutes", schedule: "*/5 * * * *", timezone: "UTC" },
  { label: "Hourly", schedule: "0 * * * *", timezone: "UTC" },
  { label: "Daily (midnight UTC)", schedule: "0 0 * * *", timezone: "UTC" },
] as const;

function isValidCronSchedule(value: string): boolean {
  const fields = value.trim().split(/\s+/);
  return fields.length === 5;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function TriggersClient({ fnId, triggers }: { fnId: string; triggers: TriggerRow[] }) {
  const byKind = useMemo(
    () => ({
      http: triggers.find((t) => t.kind === "http"),
      cron: triggers.find((t) => t.kind === "cron"),
      email: triggers.find((t) => t.kind === "email"),
      mcp: triggers.find((t) => t.kind === "mcp"),
    }),
    [triggers],
  );

  const [savingKind, setSavingKind] = useState<TriggerKind | null>(null);
  const [feedback, setFeedback] = useState<SectionFeedback>({
    http: null,
    cron: null,
    email: null,
    mcp: null,
  });

  const [requireAuth, setRequireAuth] = useState(byKind.http?.config.http?.requireAuth ? "true" : "false");
  const [cronSchedule, setCronSchedule] = useState(byKind.cron?.config.cron?.schedule ?? "*/5 * * * *");
  const [cronTimezone, setCronTimezone] = useState(byKind.cron?.config.cron?.timezone ?? "UTC");
  const [emailAddress, setEmailAddress] = useState(byKind.email?.config.email?.address ?? "");
  const [emailAllowlist, setEmailAllowlist] = useState(
    (byKind.email?.config.email?.allowlist ?? []).join(", "),
  );
  const [mcpToolName, setMcpToolName] = useState(byKind.mcp?.config.mcp?.toolName ?? "");
  const [mcpDescription, setMcpDescription] = useState(byKind.mcp?.config.mcp?.description ?? "");

  const cronIsValid = isValidCronSchedule(cronSchedule);
  const emailIsValid = emailAddress.length === 0 ? false : isValidEmail(emailAddress);
  const allowlistValues = emailAllowlist
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const invalidAllowlistEmails = allowlistValues.filter((value) => !isValidEmail(value));
  const mcpToolNameValid = mcpToolName.trim().length > 0;

  async function runAction(kind: TriggerKind, action: () => Promise<void>, successMessage: string) {
    setSavingKind(kind);
    setFeedback((prev) => ({ ...prev, [kind]: null }));
    try {
      await action();
      setFeedback((prev) => ({
        ...prev,
        [kind]: { tone: "success", message: successMessage },
      }));
    } catch (error) {
      setFeedback((prev) => ({
        ...prev,
        [kind]: {
          tone: "error",
          message: error instanceof Error ? error.message : "Failed to save trigger settings.",
        },
      }));
    } finally {
      setSavingKind(null);
    }
  }

  function renderStatus(exists: boolean, enabled: boolean) {
    if (!exists) {
      return (
        <Badge
          variant="secondary"
          className="border-[var(--color-border)] bg-white/[0.03] text-[var(--color-bone-faint)]"
        >
          Not configured
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className={
          enabled
            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
            : "border-amber-400/30 bg-amber-500/10 text-amber-300"
        }
      >
        {enabled ? "Enabled" : "Disabled"}
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-[var(--color-bone)]">HTTP trigger</h4>
          {renderStatus(true, true)}
        </div>
        <p className="text-sm text-[var(--color-bone-muted)]">
          Configure whether incoming HTTP requests should require auth when edge auth is enabled.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-[var(--color-bone-muted)]" htmlFor="require-auth-select">
            Require auth
          </label>
          <select
            id="require-auth-select"
            value={requireAuth}
            onChange={(event) => setRequireAuth(event.target.value)}
            className="h-11 min-w-44 rounded-md border border-[var(--color-border)] bg-[var(--color-ink)]/70 px-3 text-sm text-[var(--color-bone)]"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
          <Button
            disabled={savingKind === "http"}
            className="h-11 rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            onClick={() =>
              void runAction(
                "http",
                () => saveHttpTrigger({ fnId, requireAuth: requireAuth === "true" }),
                "HTTP trigger settings saved.",
              )
            }
          >
            {savingKind === "http" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {savingKind === "http" ? "Saving..." : "Save HTTP"}
          </Button>
        </div>
        {feedback.http ? (
          <p
            className={`flex items-center gap-2 text-xs ${
              feedback.http.tone === "success" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {feedback.http.tone === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <TriangleAlert className="h-3.5 w-3.5" />
            )}
            {feedback.http.message}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-[var(--color-bone)]">Cron trigger</h4>
          {renderStatus(Boolean(byKind.cron), byKind.cron?.enabled ?? false)}
        </div>
        <p className="text-sm text-[var(--color-bone-muted)]">
          Use 5-field cron syntax. Example: <span className="font-mono">*/5 * * * *</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          {CRON_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              className="rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
              onClick={() => {
                setCronSchedule(preset.schedule);
                setCronTimezone(preset.timezone);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={cronSchedule}
            onChange={(e) => setCronSchedule(e.target.value)}
            placeholder="schedule (e.g. */5 * * * *)"
            className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]"
          />
          <Input
            value={cronTimezone}
            onChange={(e) => setCronTimezone(e.target.value)}
            placeholder="timezone (e.g. UTC)"
            className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]"
          />
        </div>
        {!cronIsValid ? (
          <p className="text-xs text-red-300">Cron schedule must include 5 space-separated fields.</p>
        ) : null}
        <div className="flex gap-2">
          <Button
            disabled={savingKind === "cron" || !cronIsValid}
            className="h-11 rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            onClick={() =>
              void runAction(
                "cron",
                () =>
                  saveCronTrigger({
                    fnId,
                    schedule: cronSchedule,
                    timezone: cronTimezone || undefined,
                    enabled: byKind.cron?.enabled ?? true,
                  }),
                "Cron trigger saved.",
              )
            }
          >
            {savingKind === "cron" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {savingKind === "cron" ? "Saving..." : "Save Cron"}
          </Button>
          {byKind.cron ? (
            <>
              <Button
                variant="outline"
                disabled={savingKind === "cron"}
                className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                onClick={() =>
                  void runAction(
                    "cron",
                    () => setTriggerEnabled(fnId, "cron", !byKind.cron?.enabled),
                    byKind.cron?.enabled ? "Cron trigger disabled." : "Cron trigger enabled.",
                  )
                }
              >
                {byKind.cron.enabled ? "Disable" : "Enable"}
              </Button>
              <Button
                variant="outline"
                disabled={savingKind === "cron"}
                className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                onClick={() =>
                  void runAction("cron", () => removeTrigger(fnId, "cron"), "Cron trigger removed.")
                }
              >
                Remove
              </Button>
            </>
          ) : null}
        </div>
        {feedback.cron ? (
          <p
            className={`flex items-center gap-2 text-xs ${
              feedback.cron.tone === "success" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {feedback.cron.tone === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <TriangleAlert className="h-3.5 w-3.5" />
            )}
            {feedback.cron.message}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-[var(--color-bone)]">Email trigger</h4>
          {renderStatus(Boolean(byKind.email), byKind.email?.enabled ?? false)}
        </div>
        <p className="text-sm text-[var(--color-bone-muted)]">
          Configure an inbound mailbox and optional allowlist for senders.
        </p>
        <Input
          value={emailAddress}
          onChange={(e) => setEmailAddress(e.target.value)}
          placeholder="inbound address (e.g. alerts@yourdomain.com)"
          className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]"
        />
        {emailAddress.length > 0 && !emailIsValid ? (
          <p className="text-xs text-red-300">Please enter a valid inbound email address.</p>
        ) : null}
        <Input
          value={emailAllowlist}
          onChange={(e) => setEmailAllowlist(e.target.value)}
          placeholder="allowlist emails comma-separated"
          className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]"
        />
        {invalidAllowlistEmails.length > 0 ? (
          <p className="text-xs text-red-300">
            Invalid allowlist emails: {invalidAllowlistEmails.join(", ")}
          </p>
        ) : allowlistValues.length > 0 ? (
          <p className="text-xs text-[var(--color-bone-faint)]">
            Parsed {allowlistValues.length} allowlist {allowlistValues.length === 1 ? "entry" : "entries"}.
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button
            disabled={savingKind === "email" || !emailIsValid || invalidAllowlistEmails.length > 0}
            className="h-11 rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            onClick={() =>
              void runAction(
                "email",
                () =>
                  saveEmailTrigger({
                    fnId,
                    address: emailAddress,
                    allowlist: allowlistValues,
                    enabled: byKind.email?.enabled ?? true,
                  }),
                "Email trigger saved.",
              )
            }
          >
            {savingKind === "email" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {savingKind === "email" ? "Saving..." : "Save Email"}
          </Button>
          {byKind.email ? (
            <>
              <Button
                variant="outline"
                disabled={savingKind === "email"}
                className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                onClick={() =>
                  void runAction(
                    "email",
                    () => setTriggerEnabled(fnId, "email", !byKind.email?.enabled),
                    byKind.email?.enabled ? "Email trigger disabled." : "Email trigger enabled.",
                  )
                }
              >
                {byKind.email.enabled ? "Disable" : "Enable"}
              </Button>
              <Button
                variant="outline"
                disabled={savingKind === "email"}
                className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                onClick={() =>
                  void runAction("email", () => removeTrigger(fnId, "email"), "Email trigger removed.")
                }
              >
                Remove
              </Button>
            </>
          ) : null}
        </div>
        {feedback.email ? (
          <p
            className={`flex items-center gap-2 text-xs ${
              feedback.email.tone === "success" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {feedback.email.tone === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <TriangleAlert className="h-3.5 w-3.5" />
            )}
            {feedback.email.message}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-[var(--color-bone)]">MCP trigger metadata</h4>
          {renderStatus(Boolean(byKind.mcp), byKind.mcp?.enabled ?? false)}
        </div>
        <p className="text-sm text-[var(--color-bone-muted)]">
          Set tool metadata that clients can use when exposing this function via MCP.
        </p>
        <Input
          value={mcpToolName}
          onChange={(e) => setMcpToolName(e.target.value)}
          placeholder="tool name (required)"
          className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]"
        />
        {!mcpToolNameValid ? (
          <p className="text-xs text-red-300">Tool name is required.</p>
        ) : null}
        <Input
          value={mcpDescription}
          onChange={(e) => setMcpDescription(e.target.value)}
          placeholder="description (optional, max 512 chars)"
          className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] focus-visible:ring-[var(--color-amber)]"
        />
        <div className="flex gap-2">
          <Button
            disabled={savingKind === "mcp" || !mcpToolNameValid}
            className="h-11 rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            onClick={() =>
              void runAction(
                "mcp",
                () =>
                  saveMcpTrigger({
                    fnId,
                    toolName: mcpToolName,
                    description: mcpDescription,
                    enabled: byKind.mcp?.enabled ?? true,
                  }),
                "MCP trigger metadata saved.",
              )
            }
          >
            {savingKind === "mcp" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {savingKind === "mcp" ? "Saving..." : "Save MCP"}
          </Button>
          {byKind.mcp ? (
            <>
              <Button
                variant="outline"
                disabled={savingKind === "mcp"}
                className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                onClick={() =>
                  void runAction(
                    "mcp",
                    () => setTriggerEnabled(fnId, "mcp", !byKind.mcp?.enabled),
                    byKind.mcp?.enabled ? "MCP trigger disabled." : "MCP trigger enabled.",
                  )
                }
              >
                {byKind.mcp.enabled ? "Disable" : "Enable"}
              </Button>
              <Button
                variant="outline"
                disabled={savingKind === "mcp"}
                className="h-11 rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                onClick={() =>
                  void runAction("mcp", () => removeTrigger(fnId, "mcp"), "MCP trigger removed.")
                }
              >
                Remove
              </Button>
            </>
          ) : null}
        </div>
        {feedback.mcp ? (
          <p
            className={`flex items-center gap-2 text-xs ${
              feedback.mcp.tone === "success" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {feedback.mcp.tone === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <TriangleAlert className="h-3.5 w-3.5" />
            )}
            {feedback.mcp.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
