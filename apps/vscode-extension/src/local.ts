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

  /** `hostfunc pull` — fetch a function's code into a local checkout. */
  async pull(fn?: { id: string; slug: string }): Promise<void> {
    if (!this.auth.isSignedIn()) {
      vscode.window.showWarningMessage("Sign in to hostfunc first.");
      return;
    }
    let fnId = fn?.id;
    let slug = fn?.slug;
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
    } else {
      root = await this.pickTargetFolder(slug ?? fnId);
      if (!root) return;
    }

    const client = this.auth.client();
    const org = this.auth.getActiveOrg();
    try {
      const draft = await client.getDraft(fnId);
      await this.writeProject(
        root,
        {
          baseUrl: this.auth.baseUrl,
          fnId,
          orgSlug: org?.orgSlug ?? "",
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

  /** `hostfunc push` — write local index.ts to the server draft, handling conflicts. */
  async push(): Promise<boolean> {
    const found = await this.findProjectRoot();
    if (!found) {
      vscode.window.showWarningMessage("No hostfunc project found in the workspace.");
      return false;
    }
    const { root, config } = found;
    const code = dec.decode(
      await vscode.workspace.fs.readFile(vscode.Uri.joinPath(root, ENTRY_FILE)),
    );
    if (sha256(code) === config.sha256) {
      vscode.window.showInformationMessage("Nothing to push — local code matches the server.");
      return true;
    }

    const client = this.auth.client();
    try {
      const result = await client.pushDraft({ fnId: config.fnId, code, baseSha256: config.sha256 });
      await this.updateBase(root, config, result.sha256);
      return true;
    } catch (error) {
      if (error instanceof DraftConflictError) {
        return this.resolveConflict(root, config, code, error);
      }
      vscode.window.showErrorMessage(
        `hostfunc: push failed — ${error instanceof Error ? error.message : String(error)}`,
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

  private async updateBase(root: vscode.Uri, config: ProjectConfig, newSha: string): Promise<void> {
    await this.write(
      root,
      PROJECT_CONFIG_FILE,
      serializeProjectConfig({ ...config, sha256: newSha }),
    );
    vscode.window.showInformationMessage(`Pushed ${config.slug}.`);
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
