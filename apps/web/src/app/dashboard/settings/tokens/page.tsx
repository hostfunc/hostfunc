import { getTokens } from "./actions";
import { TokensClient } from "./tokens-client";

export default async function TokensSettingsPage() {
  const tokens = await getTokens();
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-[var(--color-bone)]">API Tokens</h3>
        <p className="text-sm text-[var(--color-bone-muted)]">
          Create and revoke tokens for CLI and MCP access.
        </p>
      </div>
      <TokensClient initialTokens={tokens} />
    </div>
  );
}
