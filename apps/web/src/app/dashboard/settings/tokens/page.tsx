import { getTokens } from "./actions";
import { TokensClient } from "./tokens-client";

export default async function TokensSettingsPage() {
  const tokens = await getTokens();
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">API Tokens</h3>
        <p className="text-sm text-muted-foreground">
          Create and revoke tokens for CLI and MCP access.
        </p>
      </div>
      <TokensClient initialTokens={tokens} />
    </div>
  );
}
