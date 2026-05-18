"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export type SettingsActionState = {
  ok?: boolean;
  message?: string;
  error?: { form?: string[] };
} | null;

export type SettingsAction = (
  state: SettingsActionState,
  formData: FormData,
) => Promise<SettingsActionState>;

interface SettingsFormProps {
  action: SettingsAction;
  successMessage?: string;
  errorMessage?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Toast title to show on success. Falls back to `state.message`, then `successMessage`.
   */
  toastSuccessTitle?: string;
}

export function SettingsForm({
  action,
  successMessage,
  errorMessage,
  toastSuccessTitle,
  children,
  className,
}: SettingsFormProps) {
  const [state, formAction] = useActionState<SettingsActionState, FormData>(action, null);
  const lastToastedRef = useRef<SettingsActionState>(null);

  useEffect(() => {
    if (!state || state === lastToastedRef.current) return;
    lastToastedRef.current = state;
    if (state.ok) {
      toast.success(toastSuccessTitle ?? "Saved", {
        description: state.message ?? successMessage,
      });
    } else if (state.error?.form?.length) {
      toast.error(errorMessage ?? "Save failed", {
        description: state.error.form.join("\n"),
      });
    }
  }, [state, successMessage, errorMessage, toastSuccessTitle]);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}

type SaveButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  label: string;
  pendingLabel?: string;
};

export function SaveButton({
  label,
  pendingLabel = "Saving…",
  className,
  variant = "glass",
  ...rest
}: SaveButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || rest.disabled}
      className={className}
      {...rest}
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="mr-2 h-4 w-4 opacity-70" />
      )}
      {pending ? pendingLabel : label}
    </Button>
  );
}
