import * as vscode from "vscode";
import { AuthManager } from "./auth.js";
import { parsePayload, validatePayloadInput } from "./lib/payload.js";
import type { LocalSync } from "./local.js";
import type { RunLogChannel } from "./logs.js";
import type { FunctionNode } from "./views/functions-tree.js";
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

  register("hostfunc.refreshFunctions", () => tree.refresh());

  // Local-first commands (M2).
  register("hostfunc.init", () => local.init());
  register("hostfunc.pull", async (node) => {
    const fn = asFunctionNode(node);
    await local.pull(fn ? { id: fn.fn.id, slug: fn.fn.slug } : undefined);
  });
  register("hostfunc.push", () => local.push());
  register("hostfunc.deployLocal", () => local.deploy());

  register("hostfunc.deploy", async (node) => {
    const fn = asFunctionNode(node);
    if (!fn) return;
    setBusy(`Deploying ${fn.fn.slug}…`);
    try {
      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Deploying ${fn.fn.slug}…` },
        () => auth.client().deploy(fn.fn.id),
      );
      tree.refresh();
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
      const client = auth.client();
      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Running ${fn.fn.slug}…` },
        () => client.run(fn.fn.id, payload),
      );
      await runLog.report(client, fn.fn.slug, result);
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
}

function asFunctionNode(node: unknown): FunctionNode | undefined {
  if (node && typeof node === "object" && "fn" in node) return node as FunctionNode;
  return undefined;
}
