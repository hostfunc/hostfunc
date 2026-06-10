import type { FunctionSummary } from "@hostfunc/api-client";
import * as vscode from "vscode";
import type { AuthManager } from "../auth.js";

/** A function row in the Functions tree. Carries the summary for command handlers. */
export class FunctionNode extends vscode.TreeItem {
  constructor(readonly fn: FunctionSummary) {
    super(fn.slug, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "hostfunc.function";
    this.description = describeStatus(fn);
    this.tooltip = buildTooltip(fn);
    this.iconPath = statusIcon(fn);
    this.id = fn.id;
  }
}

function describeStatus(fn: FunctionSummary): string {
  const deployed = fn.currentVersionId ? "deployed" : "draft";
  return `${fn.visibility} · ${deployed}`;
}

function buildTooltip(fn: FunctionSummary): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true);
  md.appendMarkdown(`**${fn.slug}**\n\n`);
  if (fn.description) md.appendMarkdown(`${fn.description}\n\n`);
  md.appendMarkdown(`- Visibility: \`${fn.visibility}\`\n`);
  md.appendMarkdown(`- Status: \`${fn.currentVersionId ? "deployed" : "draft"}\`\n`);
  if (typeof fn.executionCount === "number") {
    md.appendMarkdown(`- Executions: \`${fn.executionCount}\`\n`);
  }
  return md;
}

function statusIcon(fn: FunctionSummary): vscode.ThemeIcon {
  if (!fn.currentVersionId) return new vscode.ThemeIcon("circle-outline");
  switch (fn.latestExecutionStatus) {
    case "fn_error":
    case "infra_error":
      return new vscode.ThemeIcon("error", new vscode.ThemeColor("errorForeground"));
    case "limit_exceeded":
      return new vscode.ThemeIcon("warning", new vscode.ThemeColor("editorWarning.foreground"));
    default:
      return new vscode.ThemeIcon("pass-filled", new vscode.ThemeColor("testing.iconPassed"));
  }
}

export class FunctionsTreeProvider implements vscode.TreeDataProvider<FunctionNode> {
  private readonly didChange = new vscode.EventEmitter<FunctionNode | undefined>();
  readonly onDidChangeTreeData = this.didChange.event;

  constructor(private readonly auth: AuthManager) {
    auth.onDidChangeAuth(() => this.refresh());
  }

  refresh(): void {
    this.didChange.fire(undefined);
  }

  getTreeItem(element: FunctionNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FunctionNode): Promise<FunctionNode[]> {
    if (element) return [];
    if (!this.auth.isSignedIn()) return [];
    try {
      const { items } = await this.auth.client().listFunctions();
      return items
        .slice()
        .sort((a, b) => a.slug.localeCompare(b.slug))
        .map((fn) => new FunctionNode(fn));
    } catch (error) {
      vscode.window.showErrorMessage(
        `hostfunc: failed to load functions — ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  dispose(): void {
    this.didChange.dispose();
  }
}
