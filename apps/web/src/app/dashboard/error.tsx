"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Mail, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { getWorkspaceAccessRecoveryContext, leaveCurrentWorkspaceAction } from "./org-actions";

type RecoveryContext = Awaited<ReturnType<typeof getWorkspaceAccessRecoveryContext>>;

function isAccessRecoveryError(error: Error): boolean {
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("forbidden") ||
    msg.includes("active_membership_not_found") ||
    msg.includes("you do not have access to this workspace")
  );
}

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [context, setContext] = useState<RecoveryContext | null>(null);
  const [isLeaving, startLeavingTransition] = useTransition();
  const recoverable = isAccessRecoveryError(error);

  useEffect(() => {
    if (!recoverable) return;
    let cancelled = false;
    void getWorkspaceAccessRecoveryContext()
      .then((value) => {
        if (!cancelled) setContext(value);
      })
      .catch(() => {
        if (!cancelled) setContext(null);
      });
    return () => {
      cancelled = true;
    };
  }, [recoverable]);

  const requestAccessHref = useMemo(() => {
    const ownerEmail = context?.ownerEmail;
    if (!ownerEmail) return null;
    const workspaceLabel = context?.orgSlug || context?.orgName || "workspace";
    const subject = encodeURIComponent(`Access request for ${workspaceLabel}`);
    const body = encodeURIComponent(
      [
        "Hi,",
        "",
        `I lost access to ${workspaceLabel} in Hostfunc and need access again.`,
        "Could you re-invite me when possible?",
        "",
        "Thanks!",
      ].join("\n"),
    );
    return `mailto:${ownerEmail}?subject=${subject}&body=${body}`;
  }, [context?.orgName, context?.orgSlug, context?.ownerEmail]);

  const handleLeaveWorkspace = () => {
    startLeavingTransition(async () => {
      try {
        const result = await leaveCurrentWorkspaceAction();
        toast.success("Workspace removed from your account.");
        window.location.assign(result.redirectTo);
      } catch (leaveError) {
        const message =
          leaveError instanceof Error && leaveError.message === "owner_cannot_leave"
            ? "Owners cannot remove their own workspace."
            : leaveError instanceof Error
              ? leaveError.message
              : "Failed to remove workspace.";
        toast.error(message);
      }
    });
  };

  if (!recoverable) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/80 p-6 text-[var(--color-bone)] shadow-xl">
        <h2 className="font-display text-2xl tracking-tight">Something went wrong</h2>
        <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
          We hit an unexpected dashboard error. You can retry now or go back to a safe route.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={reset} className="rounded-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-[var(--color-border)]"
            onClick={() => router.push("/dashboard")}
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/80 p-6 text-[var(--color-bone)] shadow-xl">
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-wide text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        Access changed
      </div>
      <h2 className="mt-3 font-display text-2xl tracking-tight">Your workspace permissions were updated</h2>
      <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
        You no longer have access to this workspace view. You can request access again, or remove this
        workspace from your list.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {requestAccessHref ? (
          <Button asChild className="rounded-full bg-[var(--color-amber)] text-[var(--color-ink)]">
            <a href={requestAccessHref}>
              <Mail className="mr-2 h-4 w-4" />
              Request access again
            </a>
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            className="rounded-full border-[var(--color-border)] text-[var(--color-bone)]"
          >
            <Link href="/dashboard/settings/members">
              <Mail className="mr-2 h-4 w-4" />
              Open team settings
            </Link>
          </Button>
        )}

        <Button
          variant="outline"
          className="rounded-full border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
          onClick={handleLeaveWorkspace}
          disabled={isLeaving}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isLeaving ? "Removing..." : "Remove workspace"}
        </Button>

        <Button
          variant="ghost"
          className="rounded-full text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]"
          onClick={() => router.push("/dashboard")}
        >
          Switch workspace
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
