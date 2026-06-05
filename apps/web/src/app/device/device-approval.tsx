"use client";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";

type Phase = "review" | "approving" | "denying" | "approved" | "denied" | "error";

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").slice(0, 16);
}

export function DeviceApproval({
  initialCode,
  userEmail,
}: {
  initialCode: string;
  userEmail: string;
}) {
  const [code, setCode] = useState(normalizeCode(initialCode));
  const [phase, setPhase] = useState<Phase>("review");
  const [error, setError] = useState<string | null>(null);

  const busy = phase === "approving" || phase === "denying";
  const done = phase === "approved" || phase === "denied";

  async function approve() {
    if (!code) {
      setError("Enter the code shown in your editor.");
      return;
    }
    setPhase("approving");
    setError(null);
    const res = await authClient.device.approve({ userCode: code });
    if (res.error) {
      setPhase("error");
      setError(res.error.error_description ?? "Could not authorize this device.");
      return;
    }
    setPhase("approved");
  }

  async function deny() {
    setPhase("denying");
    setError(null);
    const res = await authClient.device.deny({ userCode: code });
    if (res.error) {
      setPhase("error");
      setError(res.error.error_description ?? "Could not deny this request.");
      return;
    }
    setPhase("denied");
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--color-ink)] px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, var(--color-amber-soft) 0%, transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/8 bg-[var(--color-ink-elevated)] p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-2">
          <Logo iconClassName="h-6 w-6" wordmarkClassName="text-lg" />
        </div>

        {done ? (
          <div className="flex flex-col items-center text-center">
            {phase === "approved" ? (
              <CheckCircle2 className="h-12 w-12 text-[var(--color-emerald)]" />
            ) : (
              <XCircle className="h-12 w-12 text-[var(--color-bone-muted)]" />
            )}
            <h1 className="mt-4 font-display text-xl text-[var(--color-bone)]">
              {phase === "approved" ? "Device authorized" : "Request denied"}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
              {phase === "approved"
                ? "You can close this tab and return to VS Code — you're signed in."
                : "No access was granted. You can close this tab."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[var(--color-amber)]">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Authorize a device
              </span>
            </div>
            <h1 className="mt-3 font-display text-2xl text-[var(--color-bone)]">
              Connect VS Code to hostfunc
            </h1>
            <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
              Confirm the code shown in your editor matches the one below, then authorize. Signed in
              as <span className="text-[var(--color-bone)]">{userEmail}</span>.
            </p>

            <label
              htmlFor="device-code"
              className="mt-6 block text-xs font-medium text-[var(--color-bone-muted)]"
            >
              Device code
            </label>
            <Input
              id="device-code"
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
              className="mt-2 text-center font-mono text-lg tracking-[0.3em]"
            />

            {error ? <p className="mt-3 text-sm text-[var(--color-rose)]">{error}</p> : null}

            <div className="mt-7 flex flex-col gap-3">
              <Button onClick={approve} disabled={busy} className="w-full">
                {phase === "approving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Authorize device"
                )}
              </Button>
              <Button onClick={deny} disabled={busy} variant="ghost" className="w-full">
                {phase === "denying" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deny"}
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
