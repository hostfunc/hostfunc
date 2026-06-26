"use client";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { passkey } from "@/lib/auth-client";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export interface PasskeySummary {
  id: string;
  name: string | null;
  deviceType: string;
  createdAt: string;
}

export function PasskeysCard({ initialPasskeys }: { initialPasskeys: PasskeySummary[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      // addPasskey runs the WebAuthn registration ceremony in the browser, then persists the
      // credential. It resolves to `{ error }` rather than throwing on a handled failure.
      const trimmed = name.trim();
      const result = await passkey.addPasskey(trimmed ? { name: trimmed } : undefined);
      if (result?.error) {
        toast.error(result.error.message ?? "Couldn't add passkey");
        return;
      }
      toast.success("Passkey added");
      setName("");
      router.refresh();
    } catch {
      // User dismissed the OS prompt or the authenticator is unavailable — not an app error.
      toast.error("Passkey registration was cancelled");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const result = await passkey.deletePasskey({ id });
      if (result?.error) {
        toast.error(result.error.message ?? "Couldn't remove passkey");
        return;
      }
      toast.success("Passkey removed");
      router.refresh();
    } catch {
      toast.error("Couldn't remove passkey");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/70 shadow-xl">
      <SettingsCardHeader>
        <SettingsCardTitle className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-[var(--color-amber)]" />
          Passkeys
        </SettingsCardTitle>
        <SettingsCardDescription>
          Sign in with Face ID, Touch ID, a device PIN, or a security key — no password or magic
          link needed.
        </SettingsCardDescription>
      </SettingsCardHeader>

      <SettingsCardContent>
        {initialPasskeys.length === 0 ? (
          <p className="text-sm text-[var(--color-bone-muted)]">
            You don't have any passkeys yet. Add one below to enable one-tap sign-in on this device.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
            {initialPasskeys.map((pk) => (
              <li key={pk.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--color-bone)]">
                    {pk.name || "Unnamed passkey"}
                  </p>
                  <p className="text-xs text-[var(--color-bone-faint)]">
                    {pk.deviceType === "multiDevice" ? "Synced" : "This device"} · Added{" "}
                    {new Date(pk.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-[var(--color-bone-muted)] hover:text-red-400"
                  disabled={deletingId === pk.id}
                  onClick={() => handleDelete(pk.id)}
                  aria-label={`Remove ${pk.name || "passkey"}`}
                >
                  {deletingId === pk.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SettingsCardContent>

      <SettingsCardFooter>
        <form onSubmit={handleAdd} className="flex w-full items-center gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Passkey name (optional), e.g. MacBook"
            maxLength={120}
            disabled={adding}
            className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
          />
          <Button
            type="submit"
            variant="glass"
            disabled={adding}
            className="shrink-0 rounded-full px-5"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Fingerprint className="mr-2 h-4 w-4" />
                Add passkey
              </>
            )}
          </Button>
        </form>
      </SettingsCardFooter>
    </SettingsCard>
  );
}
