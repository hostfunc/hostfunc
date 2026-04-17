"use client";

import { Button } from "@/components/ui/button";
import { organization, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function JoinPage() {
  const router = useRouter();
  const params = useSearchParams();
  const invitationId = params.get("invitationId");
  const { data: session, isPending } = useSession();
  const [status, setStatus] = useState<"idle" | "accepting" | "done" | "error">("idle");
  const [error, setError] = useState<string>("");

  const loginHref = useMemo(() => {
    const encoded = encodeURIComponent(`/join?invitationId=${invitationId ?? ""}`);
    return `/login?from=${encoded}`;
  }, [invitationId]);

  useEffect(() => {
    if (!invitationId || isPending || !session || status !== "idle") return;
    setStatus("accepting");
    const orgAny = organization as unknown as {
      acceptInvitation?: (input: { invitationId: string }) => Promise<unknown>;
    };
    orgAny
      .acceptInvitation?.({ invitationId })
      .then(() => {
        setStatus("done");
        router.replace("/dashboard");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unable to accept invitation.");
      });
  }, [invitationId, isPending, router, session, status]);

  if (!invitationId) {
    return (
      <main className="mx-auto max-w-xl py-24 text-center">
        <h1 className="text-2xl font-semibold">Missing invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This invitation link is incomplete. Ask the workspace owner to send a new one.
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-xl py-24 text-center">
        <h1 className="text-2xl font-semibold">Sign in to accept invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need to authenticate before we can add you to this workspace.
        </p>
        <Button asChild className="mt-6">
          <Link href={loginHref}>Continue to login</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl py-24 text-center">
      <h1 className="text-2xl font-semibold">
        {status === "error"
          ? "Invitation could not be accepted"
          : status === "done"
            ? "Invitation accepted"
            : "Accepting invitation..."}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {status === "error" ? error : "You will be redirected to your dashboard shortly."}
      </p>
      {status === "error" ? (
        <Button asChild variant="outline" className="mt-6">
          <Link href="/dashboard/settings/members">Go to team settings</Link>
        </Button>
      ) : null}
    </main>
  );
}
