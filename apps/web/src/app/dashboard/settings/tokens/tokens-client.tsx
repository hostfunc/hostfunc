"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createToken, revokeToken } from "./actions";
import { useState, useTransition } from "react";

interface TokenRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export function TokensClient({ initialTokens }: { initialTokens: TokenRow[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [name, setName] = useState("MCP token");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-4">
        <h3 className="text-base font-medium text-[var(--color-bone)]">Create API token</h3>
        <p className="mt-1 text-sm text-[var(--color-bone-muted)]">
          Token values are shown once. Store them securely.
        </p>
        <div className="mt-3 flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs border-[var(--color-border)] bg-black/30 text-[var(--color-bone)]" />
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await createToken({ name });
                if (result.ok) {
                  setCreatedToken(result.token);
                  setTokens((prev) => [result.row, ...prev]);
                }
              })
            }
          >
            Create
          </Button>
        </div>
        {createdToken ? (
          <div className="mt-3 rounded-md border border-amber-300/30 bg-amber-500/10 p-3 text-xs font-mono">
            {createdToken}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65">
        <div className="border-b border-[var(--color-border)] p-3 text-sm font-medium text-[var(--color-bone)]">Existing tokens</div>
        <div className="divide-y">
          {tokens.length === 0 ? (
            <div className="p-4 text-sm text-[var(--color-bone-muted)]">No tokens yet.</div>
          ) : (
            tokens.map((token) => (
              <div key={token.id} className="flex items-center justify-between p-3 text-sm text-[var(--color-bone)]">
                <div>
                  <p className="font-medium">{token.name}</p>
                  <p className="font-mono text-xs text-[var(--color-bone-faint)]">{token.prefix}...</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await revokeToken(token.id);
                      setTokens((prev) => prev.filter((t) => t.id !== token.id));
                    })
                  }
                >
                  Revoke
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
