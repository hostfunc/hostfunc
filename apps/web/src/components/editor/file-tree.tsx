"use client";

import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Type as FontIcon,
  Image as ImageIcon,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import {
  type DragEvent,
  type KeyboardEvent,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface FileTreeAsset {
  id: string;
  path: string;
  kind: "readme" | "image" | "font" | "other";
  mime: string;
  sizeBytes: number;
  sha256: string;
  updatedAt: string | Date;
}

interface FolderNode {
  type: "folder";
  name: string;
  path: string;
  children: TreeNode[];
}

interface FileNode {
  type: "file";
  name: string;
  path: string;
  asset: FileTreeAsset | null; // null = the synthetic index.ts entry
}

type TreeNode = FolderNode | FileNode;

interface PendingNew {
  kind: "file" | "folder";
  parent: string;
}

interface Props {
  fnId: string;
  assets: FileTreeAsset[];
  selectedPath: string;
  onSelect: (path: string) => void;
  onAssetsChanged: (assets: FileTreeAsset[]) => void;
  readOnly?: boolean;
}

const SYNTHETIC_INDEX: FileNode = {
  type: "file",
  name: "index.ts",
  path: "index.ts",
  asset: null,
};

const NAME_REGEX = /^[A-Za-z0-9._\-+@()\[\] ]+$/;
const README_STARTER =
  "# README\n\nDescribe what this function does, how to call it, and any noteworthy edge cases.";

const COLLAPSED_KEY = "hostfunc:editor:fileTreeCollapsed";
const WIDTH_KEY = "hostfunc:editor:fileTreeWidth";
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;
const COLLAPSED_WIDTH = 36;
const DEFAULT_WIDTH = 260;

const TEXT_EXTENSIONS = new Set(["md", "markdown", "txt"]);

function buildTree(assets: FileTreeAsset[], stagedFolders: string[]): TreeNode[] {
  const root: FolderNode = { type: "folder", name: "", path: "", children: [] };

  const ensureFolder = (path: string): FolderNode => {
    if (!path) return root;
    const parts = path.split("/").filter(Boolean);
    let cursor = root;
    let cumulative = "";
    for (const dir of parts) {
      cumulative = cumulative ? `${cumulative}/${dir}` : dir;
      let child = cursor.children.find(
        (item): item is FolderNode => item.type === "folder" && item.name === dir,
      );
      if (!child) {
        child = { type: "folder", name: dir, path: cumulative, children: [] };
        cursor.children.push(child);
      }
      cursor = child;
    }
    return cursor;
  };

  for (const asset of assets) {
    const parts = asset.path.split("/");
    const fileName = parts.pop();
    if (!fileName) continue;
    const parentPath = parts.join("/");
    const cursor = ensureFolder(parentPath);
    cursor.children.push({
      type: "file",
      name: fileName,
      path: asset.path,
      asset,
    });
  }

  for (const folderPath of stagedFolders) {
    if (folderPath) ensureFolder(folderPath);
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) if (n.type === "folder") sortNodes(n.children);
  };
  sortNodes(root.children);
  return root.children;
}

function iconForAsset(node: FileNode) {
  if (node.path === "index.ts") return FileCode;
  const a = node.asset;
  if (!a) return FileText;
  if (a.kind === "readme") return FileText;
  if (a.kind === "image") return ImageIcon;
  if (a.kind === "font") return FontIcon;
  return FileText;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function clampWidth(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_WIDTH;
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(value)));
}

export function FileTree({
  fnId,
  assets,
  selectedPath,
  onSelect,
  onAssetsChanged,
  readOnly = false,
}: Props) {
  const [stagedFolders, setStagedFolders] = useState<string[]>([]);
  const tree = useMemo(() => buildTree(assets, stagedFolders), [assets, stagedFolders]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    images: true,
    fonts: true,
  });
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [draggingOver, setDraggingOver] = useState<string | null>(null);
  const [dropFolder, setDropFolder] = useState<string>("");
  const [pending, setPending] = useState<PendingNew | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);

  // Hydrate persisted width / collapsed from localStorage
  useEffect(() => {
    try {
      const storedWidth = window.localStorage.getItem(WIDTH_KEY);
      if (storedWidth) {
        const parsed = Number.parseInt(storedWidth, 10);
        if (!Number.isNaN(parsed)) setWidth(clampWidth(parsed));
      }
      const storedCollapsed = window.localStorage.getItem(COLLAPSED_KEY);
      if (storedCollapsed === "1") setCollapsed(true);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(WIDTH_KEY, String(width));
    } catch {
      // ignore
    }
  }, [width, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed, hydrated]);

  useEffect(() => {
    if (renamingPath) {
      setRenameValue(renamingPath.split("/").pop() ?? renamingPath);
    } else {
      setRenameValue("");
    }
  }, [renamingPath]);

  const beginResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;
      const previousUserSelect = document.body.style.userSelect;
      const previousCursor = document.body.style.cursor;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const onMove = (e: MouseEvent) => {
        const next = clampWidth(startWidth + (e.clientX - startX));
        setWidth(next);
      };
      const onUp = () => {
        document.body.style.userSelect = previousUserSelect;
        document.body.style.cursor = previousCursor;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [width],
  );

  const toggleFolder = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: prev[path] === false ? true : !prev[path] }));
  };

  const expandFolder = (path: string) => {
    if (!path) return;
    setExpanded((prev) => ({ ...prev, [path]: true }));
  };

  const startNew = (kind: "file" | "folder", parent: string) => {
    if (parent) expandFolder(parent);
    setPendingName("");
    setPendingError(null);
    setPending({ kind, parent });
  };

  const cancelPending = () => {
    setPending(null);
    setPendingName("");
    setPendingError(null);
  };

  const refresh = async () => {
    try {
      const res = await fetch(`/api/functions/${fnId}/files`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { assets: FileTreeAsset[] };
      onAssetsChanged(json.assets);
    } catch {
      // silent
    }
  };

  const uploadFiles = async (files: FileList | File[], folderPrefix: string) => {
    if (!files.length) return;
    setBusy(true);
    try {
      const form = new FormData();
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        const target = folderPrefix ? `${folderPrefix}/${file.name}` : file.name;
        const renamed = new File([file], target, {
          type: file.type || "application/octet-stream",
        });
        form.append("files", renamed);
      }
      const res = await fetch(`/api/functions/${fnId}/files/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error: string;
          message?: string;
        } | null;
        const msg = json?.message ?? json?.error ?? "upload_failed";
        throw new Error(msg);
      }
      if (folderPrefix) {
        setStagedFolders((prev) => prev.filter((p) => p !== folderPrefix));
      }
      await refresh();
    } catch (e) {
      console.error("Asset upload failed", e);
      alert(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (path: string) => {
    if (!confirm(`Delete ${path}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/functions/${fnId}/files/${path}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete_failed");
      if (selectedPath === path) onSelect("index.ts");
      await refresh();
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onCommitRename = async (oldPath: string) => {
    const folder = oldPath.includes("/") ? oldPath.slice(0, oldPath.lastIndexOf("/")) : "";
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingPath(null);
      return;
    }
    const newPath = folder ? `${folder}/${trimmed}` : trimmed;
    if (newPath === oldPath) {
      setRenamingPath(null);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/functions/${fnId}/files/${oldPath}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rename: { toPath: newPath } }),
      });
      if (!res.ok) throw new Error("rename_failed");
      setRenamingPath(null);
      if (selectedPath === oldPath) onSelect(newPath);
      await refresh();
    } catch (e) {
      alert(`Rename failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const commitNewFile = async () => {
    if (!pending || pending.kind !== "file") return;
    const name = pendingName.trim();
    if (!name) {
      cancelPending();
      return;
    }
    if (!NAME_REGEX.test(name)) {
      setPendingError("Use letters, numbers, and . _ - + @ ( ) [ ] only.");
      return;
    }
    const fullPath = pending.parent ? `${pending.parent}/${name}` : name;
    if (fullPath === "index.ts") {
      setPendingError("'index.ts' is reserved.");
      return;
    }
    if (assets.some((a) => a.path === fullPath)) {
      setPendingError("A file with that name already exists.");
      return;
    }

    const ext = (name.split(".").pop() ?? "").toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) {
      setPendingError("Use Upload for images and fonts.");
      return;
    }
    const mime = ext === "md" || ext === "markdown" ? "text/markdown" : "text/plain";
    const contentText = name === "README.md" ? README_STARTER : "";

    setBusy(true);
    try {
      const res = await fetch(`/api/functions/${fnId}/files/upload`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: fullPath, mime, contentText }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        throw new Error(json?.message ?? json?.error ?? "create_failed");
      }
      if (pending.parent) {
        setStagedFolders((prev) => prev.filter((p) => p !== pending.parent));
      }
      cancelPending();
      onSelect(fullPath);
      await refresh();
    } catch (e) {
      setPendingError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const commitNewFolder = () => {
    if (!pending || pending.kind !== "folder") return;
    const name = pendingName.trim().replace(/^\/+|\/+$/g, "");
    if (!name) {
      cancelPending();
      return;
    }
    if (!NAME_REGEX.test(name)) {
      setPendingError("Use letters, numbers, and . _ - + @ ( ) [ ] only.");
      return;
    }
    const fullPath = pending.parent ? `${pending.parent}/${name}` : name;
    setStagedFolders((prev) => (prev.includes(fullPath) ? prev : [...prev, fullPath]));
    expandFolder(fullPath);
    setPendingName("");
    setPendingError(null);
    setPending({ kind: "file", parent: fullPath });
  };

  const handleDrop = (event: DragEvent<HTMLElement>, folder: string) => {
    event.preventDefault();
    setDraggingOver(null);
    if (readOnly) return;
    if (event.dataTransfer.files?.length) {
      void uploadFiles(event.dataTransfer.files, folder);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLElement>, folder: string) => {
    event.preventDefault();
    setDraggingOver(folder);
  };

  const renderPendingRow = (depth: number): ReactElement => {
    const isFolder = pending?.kind === "folder";
    const Icon = isFolder ? Folder : FileText;
    return (
      <div className="mx-1">
        <div
          className="flex items-center gap-1.5 rounded px-2 py-[5px]"
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          {isFolder ? <ChevronRight className="size-3 shrink-0 text-slate-500" /> : null}
          <Icon
            className={`size-3.5 shrink-0 ${isFolder ? "text-amber-300/80" : "text-slate-400"}`}
          />
          <input
            // biome-ignore lint/a11y/noAutofocus: inline new-row appears as a direct response to user click
            autoFocus
            value={pendingName}
            onChange={(event) => {
              setPendingName(event.target.value);
              setPendingError(null);
            }}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (isFolder) commitNewFolder();
                else void commitNewFile();
              } else if (event.key === "Escape") {
                event.preventDefault();
                cancelPending();
              }
            }}
            onBlur={() => {
              // Defer so a click on a hover button can take precedence
              setTimeout(() => {
                if (!pendingName.trim()) cancelPending();
              }, 120);
            }}
            placeholder={isFolder ? "folder-name" : "file.md"}
            aria-invalid={pendingError ? "true" : "false"}
            className={`h-6 flex-1 rounded border bg-[#0b0f15] px-1.5 text-[12px] text-slate-200 outline-none ${
              pendingError
                ? "border-rose-400/60 focus:border-rose-400"
                : "border-violet-400/40 focus:border-violet-400"
            }`}
          />
        </div>
        {pendingError ? (
          <p
            className="mt-0.5 text-[10px] text-rose-300"
            style={{ paddingLeft: `${depth * 14 + 28}px` }}
          >
            {pendingError}
          </p>
        ) : null}
      </div>
    );
  };

  const renderNode = (node: TreeNode, depth: number): ReactElement => {
    if (node.type === "folder") {
      const open = expanded[node.path] ?? true;
      const Chevron = open ? ChevronDown : ChevronRight;
      const FolderIcon = open ? FolderOpen : Folder;
      const isDropTarget = draggingOver === node.path;
      return (
        <div key={`folder:${node.path}`}>
          <div
            className={`group mx-1 flex items-center rounded transition hover:bg-white/5 ${
              isDropTarget ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => toggleFolder(node.path)}
              className="flex flex-1 items-center gap-1.5 px-2 py-[5px] text-left text-[12px] text-slate-200"
              style={{ paddingLeft: `${depth * 14 + 6}px` }}
            >
              <Chevron className="size-3 shrink-0 text-slate-400" />
              <FolderIcon className="size-3.5 shrink-0 text-amber-400/70" />
              <span className="truncate font-medium">{node.name}</span>
            </button>
            {!readOnly ? (
              <div className="flex items-center gap-0.5 pr-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  aria-label={`New file in ${node.path}`}
                  title="New file"
                  onClick={(e) => {
                    e.stopPropagation();
                    startNew("file", node.path);
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
                >
                  <FilePlus className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label={`New folder in ${node.path}`}
                  title="New folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    startNew("folder", node.path);
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
                >
                  <FolderPlus className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label={`Upload to ${node.path}`}
                  title="Upload here"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropFolder(node.path);
                    fileInputRef.current?.click();
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
                >
                  <Upload className="size-3" />
                </button>
              </div>
            ) : null}
          </div>
          {open ? (
            <div
              onDragOver={(event) => handleDragOver(event, node.path)}
              onDragLeave={() => setDraggingOver(null)}
              onDrop={(event) => handleDrop(event, node.path)}
            >
              {pending && pending.parent === node.path ? renderPendingRow(depth + 1) : null}
              {node.children.map((child) => renderNode(child, depth + 1))}
              {node.children.length === 0 && !(pending && pending.parent === node.path) ? (
                <div
                  className="px-2 py-[5px] text-[10px] italic text-slate-500"
                  style={{ paddingLeft: `${(depth + 1) * 14 + 6}px` }}
                >
                  empty folder
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      );
    }

    const Icon = iconForAsset(node);
    const isSelected = selectedPath === node.path;
    const isRenaming = renamingPath === node.path;
    const isSynthetic = node.asset === null;

    if (isRenaming) {
      return (
        <div
          key={`file:${node.path}`}
          className="mx-1 flex items-center gap-1.5 rounded px-2 py-[5px]"
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          <Icon className="size-3.5 text-slate-400" />
          <input
            // biome-ignore lint/a11y/noAutofocus: inline rename input appears in response to user action
            autoFocus
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onCommitRename(node.path);
              } else if (event.key === "Escape") {
                event.preventDefault();
                setRenamingPath(null);
              }
            }}
            onBlur={() => void onCommitRename(node.path)}
            className="h-6 flex-1 rounded border border-violet-400/40 bg-[#0b0f15] px-1.5 text-[12px] text-slate-200 outline-none"
          />
        </div>
      );
    }

    return (
      <div
        key={`file:${node.path}`}
        className={`group mx-1 flex items-center gap-1.5 rounded px-2 py-[5px] transition hover:bg-white/5 ${
          isSelected ? "bg-violet-500/10" : ""
        }`}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
      >
        <button
          type="button"
          onClick={() => onSelect(node.path)}
          className={`flex flex-1 items-center gap-2 truncate text-left text-[12px] transition ${
            isSelected ? "text-violet-200" : "text-slate-200"
          }`}
        >
          <Icon
            className={`size-3.5 shrink-0 ${isSelected ? "text-violet-300" : "text-slate-400"}`}
          />
          <span className="truncate">{node.name}</span>
          {node.asset ? (
            <span className="ml-auto text-[10px] text-slate-500">
              {formatSize(node.asset.sizeBytes)}
            </span>
          ) : null}
        </button>
        {!readOnly && !isSynthetic ? (
          <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              aria-label="Rename"
              onClick={() => setRenamingPath(node.path)}
              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              aria-label="Delete"
              onClick={() => void onDelete(node.path)}
              className="rounded p-1 text-rose-300 hover:bg-rose-500/10"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  if (collapsed) {
    return (
      <aside
        ref={asideRef}
        className="relative flex shrink-0 flex-col items-center border-r border-white/5 bg-[#0b0f15] py-2"
        style={{ width: COLLAPSED_WIDTH }}
      >
        <button
          type="button"
          aria-label="Expand files"
          aria-pressed="true"
          title="Expand files"
          onClick={() => setCollapsed(false)}
          className="rounded p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-slate-50"
        >
          <PanelLeftOpen className="size-4" />
        </button>
        <div className="mt-2 rotate-180 text-[9px] uppercase tracking-widest text-slate-600 [writing-mode:vertical-rl]">
          Files
        </div>
      </aside>
    );
  }

  return (
    <aside
      ref={asideRef}
      className={`relative flex shrink-0 flex-col border-r border-white/5 bg-[#0b0f15] ${
        draggingOver === "" ? "ring-1 ring-emerald-500/60" : ""
      }`}
      style={{ width }}
      onDragOver={(event) => handleDragOver(event, "")}
      onDragLeave={() => setDraggingOver(null)}
      onDrop={(event) => handleDrop(event, "")}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-400">Files</span>
        <div className="flex items-center gap-1">
          {!readOnly ? (
            <>
              <button
                type="button"
                onClick={() => startNew("file", "")}
                className="rounded p-1 text-slate-300 transition hover:bg-white/10 hover:text-slate-50"
                aria-label="New file"
                title="New file"
              >
                <FilePlus className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => startNew("folder", "")}
                className="rounded p-1 text-slate-300 transition hover:bg-white/10 hover:text-slate-50"
                aria-label="New folder"
                title="New folder"
              >
                <FolderPlus className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDropFolder("");
                  fileInputRef.current?.click();
                }}
                className="rounded p-1 text-slate-300 transition hover:bg-white/10 hover:text-slate-50"
                aria-label="Upload"
                title="Upload files"
              >
                <Upload className="size-3.5" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse files"
            aria-pressed="false"
            title="Collapse files"
            className="rounded p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
          >
            <PanelLeftClose className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-1 py-1.5">
        {/* Pinned synthetic root index.ts */}
        {renderNode(SYNTHETIC_INDEX, 0)}
        {pending && pending.parent === "" ? renderPendingRow(0) : null}
        {tree.map((node) => renderNode(node, 0))}
        {tree.length === 0 && !pending ? (
          <div className="px-3 py-8 text-center text-[11px] leading-relaxed text-slate-500">
            <p>Drop files here, or use the toolbar above to add a README, fonts, or images.</p>
          </div>
        ) : null}
      </div>
      <div className="border-t border-white/5 px-3 py-2 text-[10px] text-slate-500">
        {busy ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" /> Working…
          </span>
        ) : (
          <span>
            {assets.length} asset{assets.length === 1 ? "" : "s"} · drop files anywhere
          </span>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = event.target.files;
          if (files) void uploadFiles(files, dropFolder);
          event.target.value = "";
          setDropFolder("");
        }}
      />
      {/* Drag handle on the right edge */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize files panel"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={width}
        tabIndex={0}
        onMouseDown={beginResize}
        onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setWidth((prev) => clampWidth(prev - (event.shiftKey ? 32 : 8)));
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            setWidth((prev) => clampWidth(prev + (event.shiftKey ? 32 : 8)));
          } else if (event.key === "Home") {
            event.preventDefault();
            setWidth(MIN_WIDTH);
          } else if (event.key === "End") {
            event.preventDefault();
            setWidth(MAX_WIDTH);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setWidth(DEFAULT_WIDTH);
          }
        }}
        className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize bg-transparent outline-none transition hover:bg-violet-500/40 focus-visible:bg-violet-500/60"
      />
    </aside>
  );
}
