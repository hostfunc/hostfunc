import { env } from "@/lib/env";
import { requireOrgPermission } from "@/lib/session";
import { listApiTokens } from "@/server/api-tokens";
import { Bot } from "lucide-react";
import { McpInstallClient } from "./mcp-install-client";

export default async function McpSettingsPage() {
  const { orgId, session } = await requireOrgPermission("manage_tokens");
  const tokens = await listApiTokens(orgId, session.user.id);
  const endpoint = `${env.BETTER_AUTH_URL}/api/mcp`;
  const tokenPrefix = tokens[0]?.prefix ?? "hf_live_";

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            MCP Install <Bot className="h-6 w-6 text-[var(--color-amber)]" />
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            Connect Claude Desktop or MCP Inspector to Hostfunc tools.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-5 text-sm text-[var(--color-bone)] shadow-xl">
        <p>
          Endpoint: <span className="font-mono">{endpoint}</span>
        </p>
      </div>
      <McpInstallClient endpoint={endpoint} tokenPrefix={tokenPrefix} />
    </div>
  );
}
