"use client";

import {
  createFnAiContextAction,
  deleteFnAiContextAction,
  refreshFnAiContextUrlAction,
  toggleFnAiContextAction,
  updateFnAiContextAction,
} from "@/app/dashboard/[fn]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Link2,
  Loader2,
  NotebookPen,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

export interface ContextClientItem {
  id: string;
  kind: "note" | "url" | "file";
  name: string;
  sourceUri: string | null;
  mime: string | null;
  bytes: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const PER_ITEM_MAX = 100_000;
const PER_FUNCTION_MAX = 500_000;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function kindLabel(kind: ContextClientItem["kind"]): string {
  return kind === "note" ? "Note" : kind === "url" ? "URL" : "File";
}

function kindIcon(kind: ContextClientItem["kind"]) {
  if (kind === "note") return <NotebookPen className="h-4 w-4" />;
  if (kind === "url") return <Link2 className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function mapErrorCode(message: string): string {
  switch (message) {
    case "per_item_too_large":
      return `Document exceeds ${formatBytes(PER_ITEM_MAX)}.`;
    case "per_function_too_large":
      return `Function would exceed the ${formatBytes(PER_FUNCTION_MAX)} total budget.`;
    case "empty_content":
      return "Content cannot be empty.";
    case "invalid_url":
      return "That URL is not reachable or is not a public http(s) URL.";
    case "url_fetch_failed":
      return "Could not fetch that URL.";
    case "not_found":
      return "Document not found.";
    case "forbidden":
      return "You do not have permission to do that.";
    default:
      return message || "Something went wrong.";
  }
}

export function ContextClient({
  fnId,
  initialItems,
}: {
  fnId: string;
  initialItems: ContextClientItem[];
}) {
  const [items, setItems] = useState<ContextClientItem[]>(initialItems);
  const [noteName, setNoteName] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [urlName, setUrlName] = useState("");
  const [url, setUrl] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalBytes = items.reduce((acc, item) => acc + item.bytes, 0);
  const remaining = Math.max(0, PER_FUNCTION_MAX - totalBytes);

  const addNote = async () => {
    const name = noteName.trim();
    const content = noteContent.trim();
    if (!name || !content) return;
    setSavingNote(true);
    try {
      const res = await createFnAiContextAction({ kind: "note", fnId, name, content });
      setItems((prev) => [res.item, ...prev]);
      setNoteName("");
      setNoteContent("");
      toast.success("Note attached");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error("Failed to save note", { description: mapErrorCode(message) });
    } finally {
      setSavingNote(false);
    }
  };

  const addUrl = async () => {
    const name = urlName.trim();
    const link = url.trim();
    if (!name || !link) return;
    setSavingUrl(true);
    try {
      const res = await createFnAiContextAction({ kind: "url", fnId, name, url: link });
      setItems((prev) => [res.item, ...prev]);
      setUrlName("");
      setUrl("");
      toast.success("URL attached and fetched");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error("Failed to attach URL", { description: mapErrorCode(message) });
    } finally {
      setSavingUrl(false);
    }
  };

  const onUploadClicked = () => fileInputRef.current?.click();

  const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > PER_ITEM_MAX) {
      toast.error("File too large", {
        description: `Max per item is ${formatBytes(PER_ITEM_MAX)}.`,
      });
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", file.name);
      const res = await fetch(`/api/functions/${fnId}/context`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const code = (json?.error as string | undefined) ?? "upload_failed";
        throw new Error(code);
      }
      const item = json?.item as ContextClientItem | undefined;
      if (item) setItems((prev) => [item, ...prev]);
      toast.success("File attached");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error("Failed to upload", { description: mapErrorCode(message) });
    } finally {
      setUploading(false);
    }
  };

  const onToggleEnabled = (item: ContextClientItem) => {
    startTransition(async () => {
      const previous = item.enabled;
      setItems((prev) =>
        prev.map((candidate) =>
          candidate.id === item.id ? { ...candidate, enabled: !previous } : candidate,
        ),
      );
      try {
        const res = await toggleFnAiContextAction({
          fnId,
          id: item.id,
          enabled: !previous,
        });
        setItems((prev) => prev.map((c) => (c.id === item.id ? res.item : c)));
      } catch (error) {
        setItems((prev) =>
          prev.map((candidate) =>
            candidate.id === item.id ? { ...candidate, enabled: previous } : candidate,
          ),
        );
        const message = error instanceof Error ? error.message : "";
        toast.error("Toggle failed", { description: mapErrorCode(message) });
      }
    });
  };

  const onRename = (item: ContextClientItem, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === item.name) return;
    startTransition(async () => {
      try {
        const res = await updateFnAiContextAction({ fnId, id: item.id, name: trimmed });
        setItems((prev) => prev.map((c) => (c.id === item.id ? res.item : c)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        toast.error("Rename failed", { description: mapErrorCode(message) });
      }
    });
  };

  const onDelete = (item: ContextClientItem) => {
    startTransition(async () => {
      try {
        await deleteFnAiContextAction({ fnId, id: item.id });
        setItems((prev) => prev.filter((c) => c.id !== item.id));
        toast.success("Attached doc removed");
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        toast.error("Delete failed", { description: mapErrorCode(message) });
      }
    });
  };

  const onRefreshUrl = (item: ContextClientItem) => {
    startTransition(async () => {
      try {
        const res = await refreshFnAiContextUrlAction({ fnId, id: item.id });
        setItems((prev) => prev.map((c) => (c.id === item.id ? res.item : c)));
        toast.success("URL snapshot refreshed");
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        toast.error("Refresh failed", { description: mapErrorCode(message) });
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="text-sm font-medium text-[var(--color-bone)]">Attached documents</div>
          <div className="text-xs text-[var(--color-bone-faint)]">
            {items.length} items · {formatBytes(totalBytes)} / {formatBytes(PER_FUNCTION_MAX)} used
          </div>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[var(--color-bone-muted)]">
              No docs attached yet. Add a note, URL, or upload a file below.
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[auto_1fr_auto] md:items-center"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-ink)]/70 px-2.5 py-1 text-xs text-[var(--color-bone-muted)]">
                  {kindIcon(item.kind)}
                  {kindLabel(item.kind)}
                </span>
                <div className="min-w-0">
                  <Input
                    defaultValue={item.name}
                    onBlur={(event) => onRename(item, event.target.value)}
                    className="h-9 max-w-lg border-[var(--color-border)] bg-[var(--color-ink)]/70 font-mono text-sm text-[var(--color-bone)]"
                  />
                  <div className="mt-1 truncate text-xs text-[var(--color-bone-faint)]">
                    {item.sourceUri ? `${item.sourceUri} · ` : ""}
                    {formatBytes(item.bytes)} · updated {new Date(item.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-self-end">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-ink)]/70 px-2.5 py-1.5 text-xs text-[var(--color-bone-muted)]">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => onToggleEnabled(item)}
                      className="h-3.5 w-3.5 accent-[var(--color-amber)]"
                    />
                    Enabled
                  </label>
                  {item.kind === "url" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => onRefreshUrl(item)}
                      className="text-[var(--color-bone-muted)] hover:text-[var(--color-bone)]"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => onDelete(item)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-[var(--color-border)] bg-[var(--color-ink)]/40 px-4 py-2 text-xs text-[var(--color-bone-faint)]">
          Remaining budget: {formatBytes(remaining)} (per item max {formatBytes(PER_ITEM_MAX)})
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-bone)]">
            <NotebookPen className="h-4 w-4 text-[var(--color-amber)]" /> Add note
          </div>
          <div className="space-y-2">
            <Input
              value={noteName}
              onChange={(event) => setNoteName(event.target.value)}
              placeholder="Short name (e.g. Slack webhook spec)"
              className="h-10 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
            />
            <textarea
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
              placeholder="Paste notes, spec excerpts, or conventions here..."
              className="min-h-32 w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-ink)]/70 p-2 text-sm text-[var(--color-bone)] outline-none placeholder:text-[var(--color-bone-faint)] focus:border-[var(--color-amber)]/60"
            />
            <Button
              onClick={() => void addNote()}
              disabled={savingNote || !noteName.trim() || !noteContent.trim()}
              variant="glass"
              className="h-10 w-full rounded-full"
            >
              {savingNote ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Save note
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-bone)]">
            <Link2 className="h-4 w-4 text-[var(--color-amber)]" /> Add URL
          </div>
          <div className="space-y-2">
            <Input
              value={urlName}
              onChange={(event) => setUrlName(event.target.value)}
              placeholder="Short name (e.g. Stripe API)"
              className="h-10 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
            />
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/docs"
              className="h-10 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
            />
            <Button
              onClick={() => void addUrl()}
              disabled={savingUrl || !urlName.trim() || !url.trim()}
              variant="glass"
              className="h-10 w-full rounded-full"
            >
              {savingUrl ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Fetch and attach
            </Button>
            <p className="text-[11px] text-[var(--color-bone-faint)]">
              Fetches once at attach time. Use Refresh to re-fetch when the source changes.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-bone)]">
            <UploadCloud className="h-4 w-4 text-[var(--color-amber)]" /> Upload file
          </div>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.mdx,.txt,.json,.markdown,.text,text/*,application/json"
              onChange={(event) => void onFileSelected(event)}
              className="hidden"
            />
            <Button
              type="button"
              onClick={onUploadClicked}
              disabled={uploading}
              className="h-10 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] hover:bg-[var(--color-ink)]"
            >
              {uploading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-1 h-4 w-4" />
              )}
              Choose file
            </Button>
            <p className="text-[11px] text-[var(--color-bone-faint)]">
              Markdown, text, and JSON only. Max {formatBytes(PER_ITEM_MAX)} per file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
