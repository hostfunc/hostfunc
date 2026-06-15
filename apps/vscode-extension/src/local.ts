import { DraftConflictError } from "@hostfunc/api-client";
import * as vscode from "vscode";
import type { AuthManager } from "./auth.js";
import {
  DEFAULT_ENTRY,
  ENTRY_FILE,
  PROJECT_CONFIG_FILE,
  type ProjectConfig,
  SDK_DTS_NAME,
  TYPES_DIR,
  generateTsconfig,
  gitignoreContent,
  parseProjectConfig,
  serializeProjectConfig,
  sha256,
} from "./lib/project.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Local-first checkout operations: init, pull, push, and deploy (push-then-deploy). */
export class LocalSync {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly auth: AuthManager,
  ) {}

  /** `hostfunc init` — create a remote function and scaffold a local checkout for it. */
  async init(): Promise<void> {
    if (!this.auth.isSignedIn()) {
      vscode.window.showWarningMessage("Sign in to hostfunc first.");
      return;
    }
    const slug = await vscode.window.showInputBox({
      title: "New hostfunc function",
      prompt: "Function slug (lowercase letters, numbers, hyphens)",
      validateInput: (v) =>
        /^[a-z0-9][a-z0-9-]*$/.test(v.trim())
          ? undefined
          : "Use lowercase letters, numbers, hyphens.",
    });
    if (!slug) return;

    const root = await this.pickTargetFolder(slug.trim());
    if (!root) return;

    const client = this.auth.client();
    const org = this.auth.getActiveOrg();
    try {
      const created = await client.createFunction({ slug: slug.trim() });
      const draft = await client.getDraft(created.fnId);
      await this.writeProject(
        root,
        {
          baseUrl: this.auth.baseUrl,
          fnId: created.fnId,
          orgSlug: org?.orgSlug ?? "",
          slug: created.slug,
          sha256: draft.sha256,
        },
        draft.code || DEFAULT_ENTRY,
      );
      await this.openEntry(root);
      vscode.window.showInformationMessage(`Created and checked out ${created.slug}.`);
    } catch (error) {
      vscode.window.showErrorMessage(
        `hostfunc: init failed — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * `hostfunc pull` — fetch a function's code into a local checkout. When `orgId`/`orgSlug` are
   * passed (from the tree) the pull is scoped to that workspace's token; otherwise it uses the
   * active org. Called with no argument it refreshes the project in the current workspace.
   */
  async pull(fn?: { id: string; slug: string; orgId?: string; orgSlug?: string }): Promise<void> {
    if (!this.auth.isSignedIn()) {
      vscode.window.showWarningMessage("Sign in to hostfunc first.");
      return;
    }
    let fnId = fn?.id;
    let slug = fn?.slug;
    const orgId = fn?.orgId;
    let orgSlug = fn?.orgSlug;
    let root: vscode.Uri | undefined;

    if (!fnId) {
      // Pulling without a target: refresh the project in the active workspace.
      const found = await this.findProjectRoot();
      if (!found) {
        vscode.window.showWarningMessage(
          "Open a hostfunc project, or pull from the Functions view.",
        );
        return;
      }
      root = found.root;
      fnId = found.config.fnId;
      slug = found.config.slug;
      orgSlug = found.config.orgSlug;
    } else {
      root = await this.pickTargetFolder(slug ?? fnId);
      if (!root) return;
    }

    // Use the function's own workspace token when known, else the active org.
    const client = orgId ? await this.auth.clientForOrg(orgId) : this.auth.client();
    const resolvedSlug = orgSlug ?? this.auth.getActiveOrg()?.orgSlug ?? "";
    try {
      const draft = await client.getDraft(fnId);
      await this.writeProject(
        root,
        {
          baseUrl: this.auth.baseUrl,
          fnId,
          orgSlug: resolvedSlug,
          slug: slug ?? fnId,
          sha256: draft.sha256,
        },
        draft.code,
      );
      await this.openEntry(root);
      vscode.window.showInformationMessage(`Pulled ${slug ?? fnId}.`);
    } catch (error) {
      vscode.window.showErrorMessage(
        `hostfunc: pull failed — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Open a function's code in the editor (the tree's click action). Opens an existing local
   * checkout if one is present (so edits aren't clobbered); otherwise pulls it first.
   */
  async openFunction(fn: {
    id: string;
    slug: string;
    orgId: string;
    orgSlug: string;
  }): Promise<void> {
    const existing = await this.findCheckoutForFn(fn.id, fn.slug);
    if (existing) {
      await this.openEntry(existing);
      return;
    }
    await this.pull(fn);
  }

  /**
   * Find an existing local checkout for a function id: checks each workspace-folder root and its
   * deterministic `<slug>` subfolder (where {@link pickTargetFolder} writes) for a matching
   * `hostfunc.json`.
   */
  private async findCheckoutForFn(fnId: string, slug: string): Promise<vscode.Uri | undefined> {
    const candidates: vscode.Uri[] = [];
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      candidates.push(folder.uri, vscode.Uri.joinPath(folder.uri, slug));
    }
    for (const root of candidates) {
      try {
        const text = dec.decode(
          await vscode.workspace.fs.readFile(vscode.Uri.joinPath(root, PROJECT_CONFIG_FILE)),
        );
        if (parseProjectConfig(text).fnId === fnId) return root;
      } catch {
        // not a checkout for this fn — keep looking
      }
    }
    return undefined;
  }

  /** `hostfunc push` — write local index.ts to the server draft, handling conflicts. */
  async push(opts: { auto?: boolean } = {}): Promise<boolean> {
    const found = await this.findProjectRoot();
    if (!found) {
      if (!opts.auto)
        vscode.window.showWarningMessage("No hostfunc project found in the workspace.");
      return false;
    }
    return this.pushFrom(found.root, found.config, opts);
  }

  /**
   * Save-to-server: when a project's entry file is saved in the editor, push the draft
   * automatically. Quietly no-ops for unrelated saves, when signed out, or when nothing changed.
   */
  async pushOnSave(saved: vscode.Uri): Promise<void> {
    if (!this.auth.isSignedIn()) return;
    if (!saved.path.endsWith(`/${ENTRY_FILE}`)) return;
    const found = await this.findProjectForFile(saved);
    if (!found) return;
    // Only the project's entry file at its root is the source of truth for the draft.
    if (saved.toString() !== vscode.Uri.joinPath(found.root, ENTRY_FILE).toString()) return;
    await this.pushFrom(found.root, found.config, { auto: true });
  }

  /** Core push from a known project root. Shared by the manual command and save-to-server. */
  private async pushFrom(
    root: vscode.Uri,
    config: ProjectConfig,
    opts: { auto?: boolean } = {},
  ): Promise<boolean> {
    const code = dec.decode(
      await vscode.workspace.fs.readFile(vscode.Uri.joinPath(root, ENTRY_FILE)),
    );
    if (sha256(code) === config.sha256) {
      if (!opts.auto) {
        vscode.window.showInformationMessage("Nothing to push — local code matches the server.");
      }
      return true;
    }

    const client = this.auth.client();
    try {
      const result = await client.pushDraft({ fnId: config.fnId, code, baseSha256: config.sha256 });
      await this.updateBase(root, config, result.sha256, opts.auto);
      return true;
    } catch (error) {
      if (error instanceof DraftConflictError) {
        return this.resolveConflict(root, config, code, error);
      }
      vscode.window.showErrorMessage(
        `hostfunc: ${opts.auto ? "save to server" : "push"} failed — ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /** `hostfunc deploy` from a local checkout — push then deploy. */
  async deploy(): Promise<void> {
    const pushed = await this.push();
    if (!pushed) return;
    const found = await this.findProjectRoot();
    if (!found) return;
    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Deploying ${found.config.slug}…`,
        },
        () => this.auth.client().deploy(found.config.fnId),
      );
      const action = await vscode.window.showInformationMessage(
        `Deployed ${found.config.slug} (${result.versionId}).`,
        "Copy Run URL",
      );
      if (action === "Copy Run URL") await vscode.env.clipboard.writeText(result.runUrl);
    } catch (error) {
      vscode.window.showErrorMessage(
        `hostfunc: deploy failed — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async resolveConflict(
    root: vscode.Uri,
    config: ProjectConfig,
    localCode: string,
    conflict: DraftConflictError,
  ): Promise<boolean> {
    // Show a native diff: local (left) vs the newer server draft (right).
    const localUri = vscode.Uri.joinPath(root, ENTRY_FILE);
    const serverUri = vscode.Uri.parse(
      `untitled:${vscode.Uri.joinPath(root, "server-draft.ts").path}`,
    );
    const serverDoc = await vscode.workspace.openTextDocument(serverUri);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(serverUri, new vscode.Position(0, 0), conflict.serverCode);
    await vscode.workspace.applyEdit(edit);
    await vscode.window.showTextDocument(serverDoc, { preview: true });
    await vscode.commands.executeCommand(
      "vscode.diff",
      serverUri,
      localUri,
      "hostfunc: server draft ↔ your local index.ts",
    );

    const choice = await vscode.window.showWarningMessage(
      "The server draft changed since you last synced.",
      { modal: true },
      "Overwrite server with local",
      "Discard local, keep server",
    );
    if (choice === "Overwrite server with local") {
      const result = await this.auth
        .client()
        .pushDraft({ fnId: config.fnId, code: localCode, force: true });
      await this.updateBase(root, config, result.sha256);
      return true;
    }
    if (choice === "Discard local, keep server") {
      await vscode.workspace.fs.writeFile(localUri, enc.encode(conflict.serverCode));
      await this.updateBase(root, config, conflict.serverSha256);
      return true;
    }
    return false;
  }

  private async writeProject(root: vscode.Uri, config: ProjectConfig, code: string): Promise<void> {
    await vscode.workspace.fs.createDirectory(root);
    await this.write(root, ENTRY_FILE, code);
    await this.write(root, PROJECT_CONFIG_FILE, serializeProjectConfig(config));
    await this.write(root, "tsconfig.json", generateTsconfig());
    await this.write(root, ".gitignore", gitignoreContent());
    await this.write(root, `${TYPES_DIR}/${SDK_DTS_NAME}`, await this.readSdkDts());
  }

  private async updateBase(
    root: vscode.Uri,
    config: ProjectConfig,
    newSha: string,
    auto = false,
  ): Promise<void> {
    await this.write(
      root,
      PROJECT_CONFIG_FILE,
      serializeProjectConfig({ ...config, sha256: newSha }),
    );
    if (auto) {
      vscode.window.setStatusBarMessage(`$(cloud-upload) hostfunc: saved ${config.slug}`, 3000);
    } else {
      vscode.window.showInformationMessage(`Pushed ${config.slug}.`);
    }
  }

  private async readSdkDts(): Promise<string> {
    const uri = vscode.Uri.joinPath(this.context.extensionUri, "assets", "sdk-types", SDK_DTS_NAME);
    return dec.decode(await vscode.workspace.fs.readFile(uri));
  }

  private async write(root: vscode.Uri, relPath: string, content: string): Promise<void> {
    const target = vscode.Uri.joinPath(root, ...relPath.split("/"));
    await vscode.workspace.fs.writeFile(target, enc.encode(content));
  }

  private async openEntry(root: vscode.Uri): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(root, ENTRY_FILE));
    await vscode.window.showTextDocument(doc);
  }

  /** Finds the first workspace folder containing a hostfunc.json. */
  private async findProjectRoot(): Promise<{ root: vscode.Uri; config: ProjectConfig } | null> {
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      const configUri = vscode.Uri.joinPath(folder.uri, PROJECT_CONFIG_FILE);
      try {
        const text = dec.decode(await vscode.workspace.fs.readFile(configUri));
        return { root: folder.uri, config: parseProjectConfig(text) };
      } catch {
        // not a hostfunc project — keep looking
      }
    }
    return null;
  }

  /** Walks up from a file to the nearest ancestor directory containing a hostfunc.json. */
  private async findProjectForFile(
    file: vscode.Uri,
  ): Promise<{ root: vscode.Uri; config: ProjectConfig } | null> {
    let dir = vscode.Uri.joinPath(file, "..");
    for (let depth = 0; depth < 64; depth++) {
      const configUri = vscode.Uri.joinPath(dir, PROJECT_CONFIG_FILE);
      try {
        const text = dec.decode(await vscode.workspace.fs.readFile(configUri));
        return { root: dir, config: parseProjectConfig(text) };
      } catch {
        // not here — keep walking up
      }
      const parent = vscode.Uri.joinPath(dir, "..");
      if (parent.path === dir.path) break; // reached filesystem root
      dir = parent;
    }
    return null;
  }

  /** Picks `<workspaceRoot>/<slug>` (created on write), or asks the user to open a folder. */
  private async pickTargetFolder(slug: string): Promise<vscode.Uri | undefined> {
    const base = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (base) return vscode.Uri.joinPath(base, slug);
    const picked = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      openLabel: "Select parent folder",
    });
    const parent = picked?.[0];
    return parent ? vscode.Uri.joinPath(parent, slug) : undefined;
  }
}
