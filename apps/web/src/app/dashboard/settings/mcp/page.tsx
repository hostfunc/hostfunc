import { env } from "@/lib/env";
import { requireActiveOrg } from "@/lib/session";
import { listApiTokens } from "@/server/api-tokens";
import { McpInstallClient } from "./mcp-install-client";

export default async function McpSettingsPage() {
  const { orgId, session } = await requireActiveOrg();
  const tokens = await listApiTokens(orgId, session.user.id);
  const endpoint = `${env.BETTER_AUTH_URL}/api/mcp`;
  const tokenPrefix = tokens[0]?.prefix ?? "ofn_live_";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-[var(--color-bone)]">MCP Install</h3>
        <p className="text-sm text-[var(--color-bone-muted)]">
          Connect Claude Desktop or MCP Inspector to Hostfunc tools.
        </p>
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-4 text-sm text-[var(--color-bone)]">
        <p>
          Endpoint: <span className="font-mono">{endpoint}</span>
        </p>
      </div>
      <McpInstallClient endpoint={endpoint} tokenPrefix={tokenPrefix} />
    </div>
  );
}
