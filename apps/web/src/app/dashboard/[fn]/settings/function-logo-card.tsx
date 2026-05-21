"use client";

import { FunctionLogo } from "@/components/function/function-logo";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_LOGO_MIME_LIST,
  MAX_LOGO_BYTES,
  isAcceptedLogoMime,
  isHttpLogo,
} from "@/lib/logo";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

const ACCEPT_ATTR = ACCEPTED_LOGO_MIME_LIST.join(",");

/** Maps the route handler's error codes to user-facing copy. */
function messageForError(code: unknown): string {
  switch (code) {
    case "logo_storage_not_configured":
      return "Logo storage isn't configured for this environment.";
    case "unsafe_svg":
      return "That SVG contains scripts or handlers and can't be used.";
    case "unsupported_file_type":
      return "Unsupported image type. Use a PNG, JPEG, WebP, or SVG.";
    case "file_too_large":
      return "Image must be 2 MB or smaller.";
    case "empty_file":
      return "That file is empty.";
    case "storage_error":
      return "Storage is temporarily unavailable. Please try again.";
    case "forbidden":
      return "You don't have permission to change this function.";
    case "not_found":
      return "This function no longer exists.";
    default:
      return "Failed to update the function logo. Please try again.";
  }
}

export function FunctionLogoCard({
  fnId,
  fnName,
  initialLogo,
}: {
  fnId: string;
  fnName: string;
  initialLogo: string | null;
}) {
  const router = useRouter();
  const [logo, setLogo] = useState<string | null>(initialLogo);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [action, setAction] = useState<"upload" | "remove" | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive the preview URL from the picked file. Creating the object URL inside
  // the effect (and revoking it in cleanup) is Strict-Mode safe.
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearSelection = () => {
    setSelectedFile(null);
    resetFileInput();
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isAcceptedLogoMime(file.type)) {
      toast.error("Use a PNG, JPEG, WebP, or SVG image.");
      resetFileInput();
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Image must be 2 MB or smaller.");
      resetFileInput();
      return;
    }
    setSelectedFile(file);
  };

  const onUpload = () => {
    if (!selectedFile) return;
    setAction("upload");
    startTransition(async () => {
      try {
        const body = new FormData();
        body.append("file", selectedFile);
        const res = await fetch(`/api/functions/${fnId}/logo`, { method: "POST", body });
        const data = (await res.json().catch(() => ({}))) as { logo?: string; error?: string };
        if (!res.ok) {
          toast.error(messageForError(data.error));
          return;
        }
        setLogo(data.logo ?? null);
        clearSelection();
        toast.success("Function logo updated.");
        router.refresh();
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setAction(null);
      }
    });
  };

  const onRemove = () => {
    setAction("remove");
    startTransition(async () => {
      try {
        const res = await fetch(`/api/functions/${fnId}/logo`, { method: "DELETE" });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          toast.error(messageForError(data.error));
          return;
        }
        setLogo(null);
        clearSelection();
        toast.success("Function logo removed.");
        router.refresh();
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setAction(null);
      }
    });
  };

  const displayLogo = previewUrl ?? logo;
  const canRemove = isHttpLogo(logo) && !previewUrl;

  return (
    <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/70 shadow-xl">
      <SettingsCardHeader>
        <SettingsCardTitle className="flex items-center gap-2">
          {/* <ImageIcon className="h-4 w-4 text-[var(--color-amber)]" /> */}
          Function Logo
        </SettingsCardTitle>
        <SettingsCardDescription>
          Upload a PNG, JPEG, WebP, or SVG up to 2 MB. It replaces the default mark on this
          function's cards.
        </SettingsCardDescription>
      </SettingsCardHeader>
      <SettingsCardContent>
        <div className="flex items-center gap-5">
          <FunctionLogo logo={displayLogo} name={fnName} size="lg" />
          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_ATTR}
              onChange={onFileChange}
              disabled={pending}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending}
              className="w-fit rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
            >
              {previewUrl ? "Choose a different image" : "Choose image"}
            </Button>
            <p className="px-1 text-xs text-[var(--color-bone-faint)]">
              {previewUrl ? "Ready to upload — click Save logo." : "Square images work best."}
            </p>
          </div>
        </div>
      </SettingsCardContent>
      <SettingsCardFooter className="justify-end gap-3">
        {canRemove ? (
          <Button
            type="button"
            onClick={onRemove}
            disabled={pending}
            variant="outline"
            className="rounded-full border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
          >
            {action === "remove" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {action === "remove" ? "Removing..." : "Remove"}
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={onUpload}
          disabled={pending || !selectedFile}
          variant="glass"
          className="rounded-full px-5"
        >
          {action === "upload" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {action === "upload" ? "Saving..." : "Save logo"}
        </Button>
      </SettingsCardFooter>
    </SettingsCard>
  );
}
