import * as vscode from "vscode";
import { AuthManager } from "./auth.js";
import { parsePayload, validatePayloadInput } from "./lib/payload.js";
import type { LocalSync } from "./local.js";
import type { RunLogChannel } from "./logs.js";
import type {
  ExecutionNode,
  FunctionNode,
  GroupNode,
  HfNode,
  WorkspaceNode,
} from "./views/functions-tree.js";
import type { FunctionsTreeProvider } from "./views/functions-tree.js";

interface CommandDeps {
  auth: AuthManager;
  tree: FunctionsTreeProvider;
  runLog: RunLogChannel;
  local: LocalSync;
  setBusy: (label: string | null) => void;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  { auth, tree, runLog, local, setBusy }: CommandDeps,
): void {
  const register = (id: string, handler: (...args: unknown[]) => unknown) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));

  register("hostfunc.signIn", async () => {
    try {
      await auth.signIn();
      const org = auth.getActiveOrg();
      vscode.window.showInformationMessage(
        `hostfunc: signed in to ${org?.orgName ?? "workspace"}.`,
      );
    } catch (error) {
      vscode.window.showErrorMessage(`hostfunc: ${AuthManager.describeError(error)}`);
    }
  });

  register("hostfunc.signOut", async () => {
    await auth.signOut();
    vscode.window.showInformationMessage("hostfunc: signed out.");
  });

  register("hostfunc.switchOrg", async () => {
    try {
      await auth.switchOrg();
    } catch (error) {
      vscode.window.showErrorMessage(`hostfunc: ${AuthManager.describeError(error)}`);
    }
  });

  // Make the clicked workspace the active one (drives the status bar, local-first commands, sign-out).
  register("hostfunc.setActiveWorkspace", async (node) => {
    const ws = asWorkspaceNode(node);
    if (!ws) return;
    try {
      await auth.setActiveOrgById(ws.org.orgId, ws.org.orgSlug, ws.org.orgName);
      vscode.window.showInformationMessage(`hostfunc: switched to ${ws.org.orgName}.`);
    } catch (error) {
      vscode.window.showErrorMessage(`hostfunc: ${AuthManager.describeError(error)}`);
    }
  });

  register("hostfunc.openWorkspaceDashboard", async (node) => {
    const ws = asWorkspaceNode(node);
    if (!ws) return;
    await vscode.env.openExternal(vscode.Uri.parse(`${auth.baseUrl}/dashboard`));
  });

  register("hostfunc.refreshFunctions", () => tree.refresh());

  // Local-first commands (M2).
  register("hostfunc.init", () => local.init());
  register("hostfunc.pull", async (node) => {
    const fn = asFunctionNode(node);
    await local.pull(
      fn ? { id: fn.fn.id, slug: fn.fn.slug, orgId: fn.orgId, orgSlug: fn.fn.orgSlug } : undefined,
    );
  });

  // Click a function in the tree → open its code (pulls to a checkout first if needed).
  register("hostfunc.openFunction", async (node) => {
    const fn = asFunctionNode(node);
    if (!fn) return;
    await local.openFunction({
      id: fn.fn.id,
      slug: fn.fn.slug,
      orgId: fn.orgId,
      orgSlug: fn.fn.orgSlug,
    });
  });
  register("hostfunc.push", () => local.push());
  register("hostfunc.deployLocal", () => local.deploy());

  register("hostfunc.deploy", async (node) => {
    const fn = asFunctionNode(node);
    if (!fn) return;
    setBusy(`Deploying ${fn.fn.slug}…`);
    try {
      const client = await auth.clientForOrg(fn.orgId);
      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Deploying ${fn.fn.slug}…` },
        () => client.deploy(fn.fn.id),
      );
      tree.refreshNode(fn);
      const open = await vscode.window.showInformationMessage(
        `Deployed ${fn.fn.slug} (${result.versionId}).`,
        "Copy Run URL",
      );
      if (open === "Copy Run URL") await vscode.env.clipboard.writeText(result.runUrl);
    } catch (error) {
      vscode.window.showErrorMessage(
        `hostfunc: deploy failed — ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(null);
    }
  });

  register("hostfunc.run", async (node) => {
    const fn = asFunctionNode(node);
    if (!fn) return;
    const input = await vscode.window.showInputBox({
      title: `Run ${fn.fn.slug}`,
      prompt: "JSON payload passed to main(input). Leave empty for {}.",
      value: "{}",
      validateInput: validatePayloadInput,
    });
    if (input === undefined) return; // cancelled

    const payload = parsePayload(input);
    setBusy(`Running ${fn.fn.slug}…`);
    try {
      const client = await auth.clientForOrg(fn.orgId);
      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Running ${fn.fn.slug}…` },
        () => client.run(fn.fn.id, payload),
      );
      await runLog.report(client, fn.fn.slug, result);
      tree.refreshNode(fn);
      if (!result.ok || result.status >= 400) {
        vscode.window.showErrorMessage(
          `hostfunc: ${fn.fn.slug} returned error (${result.status}).`,
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `hostfunc: run failed — ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(null);
    }
  });

  register("hostfunc.openInDashboard", async (node) => {
    const fn = asFunctionNode(node);
    if (!fn) return;
    await vscode.env.openExternal(vscode.Uri.parse(`${auth.baseUrl}/dashboard/${fn.fn.slug}`));
  });

  register("hostfunc.copyFnId", async (node) => {
    const fn = asFunctionNode(node);
    if (!fn) return;
    await vscode.env.clipboard.writeText(fn.fn.id);
    vscode.window.showInformationMessage(`Copied ${fn.fn.id}`);
  });

  register("hostfunc.viewLogs", async (node) => {
    const exec = asExecutionNode(node);
    if (!exec) return;
    try {
      const client = await auth.clientForOrg(exec.orgId);
      await runLog.showLogs(client, exec.exec.id, exec.exec.fnSlug);
    } catch (error) {
      vscode.window.showErrorMessage(
        `hostfunc: failed to load logs — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  register("hostfunc.copyExecutionId", async (node) => {
    const exec = asExecutionNode(node);
    if (!exec) return;
    await vscode.env.clipboard.writeText(exec.exec.id);
    vscode.window.showInformationMessage(`Copied ${exec.exec.id}`);
  });

  // Add/overwrite a secret on a function. The value input is masked; values are never read back.
  register("hostfunc.addSecret", async (node) => {
    const target = asSecretTarget(node);
    if (!target) return;
    const key = await vscode.window.showInputBox({
      title: "Add hostfunc secret",
      prompt: "Secret name (e.g. API_KEY)",
      validateInput: (v) =>
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(v.trim())
          ? undefined
          : "Use letters, numbers, and underscores; cannot start with a number.",
    });
    if (!key) return;
    const value = await vscode.window.showInputBox({
      title: `Value for ${key.trim()}`,
      prompt: "Secret value (stored encrypted; never shown again)",
      password: true,
    });
    if (value === undefined) return;
    try {
      const client = await auth.clientForOrg(target.orgId);
      await client.setSecret(target.fnId, key.trim(), value);
      tree.refreshNode(node as HfNode);
      vscode.window.showInformationMessage(`hostfunc: set secret ${key.trim()}.`);
    } catch (error) {
      vscode.window.showErrorMessage(
        `hostfunc: failed to set secret — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}

function isNode(node: unknown): node is HfNode {
  return Boolean(node) && typeof node === "object" && "kind" in (node as object);
}

function asFunctionNode(node: unknown): FunctionNode | undefined {
  return isNode(node) && node.kind === "function" ? node : undefined;
}

function asWorkspaceNode(node: unknown): WorkspaceNode | undefined {
  return isNode(node) && node.kind === "workspace" ? node : undefined;
}

function asExecutionNode(node: unknown): ExecutionNode | undefined {
  return isNode(node) && node.kind === "execution" ? node : undefined;
}

/** Resolve a `{ fnId, orgId }` target from either a function node or its secrets group node. */
function asSecretTarget(node: unknown): { fnId: string; orgId: string } | undefined {
  if (!isNode(node)) return undefined;
  if (node.kind === "function") return { fnId: node.fn.id, orgId: node.orgId };
  if (node.kind === "group") {
    const g = node as GroupNode;
    return { fnId: g.fnId, orgId: g.orgId };
  }
  return undefined;
}
