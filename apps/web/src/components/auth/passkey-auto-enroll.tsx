"use client";

import { passkey } from "@/lib/auth-client";
import { useEffect } from "react";
import { toast } from "sonner";

// Attempt at most once per browser so we never nag a returning user.
const ATTEMPT_FLAG = "hf:passkey-autoenroll:v1";

/**
 * Industry-standard passkey enrollment: after a user signs in (Google / GitHub / magic link), try
 * to silently create a passkey using the credential manager they just used — the same thing Google
 * and GitHub do. No button, no interstitial. `useAutoRegister` leans on WebAuthn conditional
 * creation; unsupported browsers or a declined prompt just no-op. Renders nothing.
 *
 * Mounted only when the user has no passkey yet (the server decides via `hasPasskey`).
 */
export function PasskeyAutoEnroll({ hasPasskey }: { hasPasskey: boolean }) {
  useEffect(() => {
    if (hasPasskey) return;
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(ATTEMPT_FLAG)) return;
    } catch {
      return;
    }

    void (async () => {
      try {
        const result = await passkey.addPasskey({ useAutoRegister: true });
        if (!result?.error) {
          toast.success("Passkey enabled — sign in faster next time with Face ID or Touch ID.");
        }
      } catch {
        // Unsupported browser, no platform authenticator, or the user dismissed it — never block.
      } finally {
        // Mark attempted regardless of outcome so this runs once, not on every navigation.
        try {
          localStorage.setItem(ATTEMPT_FLAG, "1");
        } catch {
          // ignore storage failures (private mode, etc.)
        }
      }
    })();
  }, [hasPasskey]);

  return null;
}
