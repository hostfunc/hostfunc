"use client";

import {
  SettingsCard,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteFunction } from "../actions";

export function DeleteFunctionCard({ fnId, fnName }: { fnId: string; fnName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  const confirmed = confirmText.trim() === fnName;

  const onDelete = () => {
    if (!confirmed) return;
    startTransition(async () => {
      try {
        await deleteFunction({ fnId });
        toast.success("Function deleted.");
        router.push("/dashboard/functions");
      } catch (error) {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : "Failed to delete the function. Please try again.",
        );
      }
    });
  };

  return (
    <SettingsCard className="rounded-2xl border-red-500/25 bg-red-500/10 shadow-xl">
      <SettingsCardHeader>
        <SettingsCardTitle className="text-red-300">Danger Zone</SettingsCardTitle>
        <SettingsCardDescription className="text-red-300/85">
          Permanently delete this function and all its executions. This cannot be undone.
        </SettingsCardDescription>
      </SettingsCardHeader>
      <SettingsCardFooter className="justify-end border-red-500/30 bg-red-500/15">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setConfirmText("");
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive">Delete Function</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)] shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg text-[var(--color-bone)]">
                Delete this function?
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm text-[var(--color-bone-muted)]">
                This permanently deletes{" "}
                <span className="font-semibold text-[var(--color-bone)]">{fnName}</span>, including
                every deployed version, draft, secret, trigger, and execution history. This cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 grid gap-2">
              <Label htmlFor="confirmFnName" className="text-[var(--color-bone-muted)]">
                Type <span className="font-mono text-[var(--color-bone)]">{fnName}</span> to confirm
              </Label>
              <Input
                id="confirmFnName"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder={fnName}
                autoComplete="off"
                disabled={pending}
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:ring-red-500"
              />
            </div>
            <DialogFooter className="mt-4 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={!confirmed || pending}
                className="rounded-full"
              >
                {pending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {pending ? "Deleting..." : "Delete function"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsCardFooter>
    </SettingsCard>
  );
}
