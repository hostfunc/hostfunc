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
    <div className="space-y-8">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
        <h3 className="text-base font-semibold text-[var(--color-bone)]">Create API token</h3>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-bone-muted)]">
          Token values are shown once. Store them securely.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:ring-[var(--color-amber)]"
          />
          <Button
            disabled={pending}
            className="rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)] sm:w-fit"
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
          <div className="mt-4 rounded-md border border-amber-300/30 bg-amber-500/10 p-3 text-xs font-mono text-amber-100">
            {createdToken}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 shadow-xl">
        <div className="border-b border-[var(--color-border)] px-6 py-4 text-sm font-semibold text-[var(--color-bone)]">
          Existing tokens
        </div>
        <div className="divide-y">
          {tokens.length === 0 ? (
            <div className="p-6 text-sm text-[var(--color-bone-muted)]">No tokens yet.</div>
          ) : (
            tokens.map((token) => (
              <div key={token.id} className="flex items-center justify-between px-6 py-4 text-sm text-[var(--color-bone)]">
                <div>
                  <p className="font-medium text-[var(--color-bone)]">{token.name}</p>
                  <p className="font-mono text-xs text-[var(--color-bone-faint)]">{token.prefix}...</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  className="rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
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
