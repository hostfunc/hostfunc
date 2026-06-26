"use client";

import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings/settings-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, Globe, ImageIcon, ShieldCheck, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface HostingSettingsClientProps {
  fnId: string;
  runUrl: string;
  hasIndexHtml: boolean;
  faviconPath: string | null;
  isDeployed: boolean;
}

const FAVICON_ACCEPT = ".ico,.png,.svg,image/x-icon,image/png,image/svg+xml";

export function HostingSettingsClient({
  fnId,
  runUrl,
  hasIndexHtml,
  faviconPath,
  isDeployed,
}: HostingSettingsClientProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function copyUrl() {
    await navigator.clipboard.writeText(runUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["ico", "png", "svg"].includes(ext)) {
      toast.error("Favicon must be a .ico, .png, or .svg file.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("files", file);
      form.append("path", `favicon.${ext}`);
      const res = await fetch(`/api/functions/${fnId}/files/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Upload failed");
      }
      toast.success("Favicon uploaded. Redeploy to publish it.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Favicon upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Public URL */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-sky-300" />
            Public web address
          </SettingsCardTitle>
          <SettingsCardDescription>
            The URL where this function is served. When you ship an{" "}
            <code className="font-mono text-[var(--color-bone)]">index.html</code>, visiting this
            address renders your web page; otherwise it runs your{" "}
            <code className="font-mono text-[var(--color-bone)]">main()</code> handler.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-[var(--color-border)] bg-white/[0.03] px-3 py-2 font-mono text-xs text-[var(--color-bone)]">
              {runUrl}
            </code>
            <Button variant="ghost" size="sm" onClick={copyUrl} className="shrink-0">
              {copied ? (
                <Check className="mr-1 h-3.5 w-3.5" />
              ) : (
                <Copy className="mr-1 h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" asChild className="shrink-0" disabled={!isDeployed}>
              <a href={runUrl} target="_blank" rel="noreferrer noopener">
                Visit
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
          {!isDeployed ? (
            <p className="text-xs text-[var(--color-bone-faint)]">
              Deploy the function to make this address live.
            </p>
          ) : null}
        </SettingsCardContent>
      </SettingsCard>

      {/* Web page status */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Web page</SettingsCardTitle>
          <SettingsCardDescription>
            Add an <code className="font-mono text-[var(--color-bone)]">index.html</code> file (plus
            any CSS, JS, images, or fonts) in the editor to host a static or client-rendered web
            page at your public address.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-3">
          <div className="flex items-center gap-2">
            {hasIndexHtml ? (
              <Badge
                variant="secondary"
                className="border-sky-400/40 bg-sky-500/15 text-[10px] font-semibold text-sky-200"
              >
                <Globe className="mr-1 h-3 w-3" />
                Serving a web page
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="border-[var(--color-border)] bg-white/[0.03] text-[10px] font-medium text-[var(--color-bone-faint)]"
              >
                No index.html — API only
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild className="border-[var(--color-border)]">
            <a href={`/dashboard/${fnId}`}>Open editor</a>
          </Button>
        </SettingsCardContent>
      </SettingsCard>

      {/* Favicon */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[var(--color-bone-muted)]" />
            Favicon
          </SettingsCardTitle>
          <SettingsCardDescription>
            The icon shown in the browser tab. Upload a{" "}
            <code className="font-mono text-[var(--color-bone)]">.ico</code>,{" "}
            <code className="font-mono text-[var(--color-bone)]">.png</code>, or{" "}
            <code className="font-mono text-[var(--color-bone)]">.svg</code>. A{" "}
            <code className="font-mono text-[var(--color-bone)]">favicon.ico</code> is linked into
            your page automatically when your HTML doesn&apos;t declare its own icon.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent className="space-y-3">
          <div className="flex items-center gap-2">
            {faviconPath ? (
              <Badge
                variant="secondary"
                className="border-emerald-400/30 bg-emerald-500/10 text-[10px] font-medium text-emerald-300"
              >
                <Check className="mr-1 h-3 w-3" />
                {faviconPath}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="border-[var(--color-border)] bg-white/[0.03] text-[10px] font-medium text-[var(--color-bone-faint)]"
              >
                No favicon set
              </Badge>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={FAVICON_ACCEPT}
            className="hidden"
            onChange={onFaviconChange}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="border-[var(--color-border)]"
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            {uploading ? "Uploading…" : faviconPath ? "Replace favicon" : "Upload favicon"}
          </Button>
        </SettingsCardContent>
      </SettingsCard>

      {/* Security posture */}
      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Security &amp; isolation
          </SettingsCardTitle>
          <SettingsCardDescription>
            How hostfunc protects visitors to your page and keeps functions isolated.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent>
          <ul className="space-y-2 text-sm text-[var(--color-bone-muted)]">
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              All HTML runs under a sandbox Content-Security-Policy with{" "}
              <code className="font-mono text-[var(--color-bone)]">nosniff</code> — whether it comes
              from a static file or your handler — so each page executes at its own opaque origin
              and can&apos;t read platform cookies or another page&apos;s storage.
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              The platform strips the visitor&apos;s dashboard session from every request before it
              reaches your code — your function can never see a logged-in user&apos;s cookies.
            </li>
          </ul>
        </SettingsCardContent>
      </SettingsCard>
    </div>
  );
}
