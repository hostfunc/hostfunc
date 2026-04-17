import { getTokens } from "./actions";
import { TokensClient } from "./tokens-client";
import { KeyRound } from "lucide-react";

export default async function TokensSettingsPage() {
  const tokens = await getTokens();
  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            API Tokens <KeyRound className="h-6 w-6 text-[var(--color-amber)]" />
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            Create and revoke personal API tokens used by CLI and MCP clients.
          </p>
        </div>
      </div>
      <TokensClient initialTokens={tokens} />
    </div>
  );
}
