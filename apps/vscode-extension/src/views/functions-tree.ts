import type {
  ExecutionStatus,
  ExecutionSummary,
  FunctionSummary,
  HostfuncApiClient,
  OrgMembership,
  SecretKeySummary,
  TriggerSummary,
  VersionSummary,
} from "@hostfunc/api-client";
import * as vscode from "vscode";
import type { AuthManager } from "../auth.js";

const Collapsed = vscode.TreeItemCollapsibleState.Collapsed;

/**
 * The hostfunc tree is hierarchical:
 *   Environment → Workspace → Function → (Detail + Triggers/Runs/Secrets/Versions groups)
 * Every node carries the ids its children need so fetching can stay lazy (only on expand).
 */
export type HfNode =
  | EnvNode
  | WorkspaceNode
  | FunctionNode
  | GroupNode
  | DetailNode
  | TriggerNode
  | ExecutionNode
  | SecretNode
  | VersionNode
  | PlaceholderNode;

export type GroupKind = "triggers" | "runs" | "secrets" | "versions";

/** The environment / control-plane indicator at the top of the tree. */
export class EnvNode extends vscode.TreeItem {
  readonly kind = "env" as const;
  constructor(env: { label: string; icon: string; host: string }, baseUrl: string) {
    super(`${env.label}`, vscode.TreeItemCollapsibleState.None);
    this.description = env.host;
    this.iconPath = new vscode.ThemeIcon(env.icon);
    this.contextValue = "hostfunc.env";
    const md = new vscode.MarkdownString(undefined, true);
    md.appendMarkdown(`**${env.label} environment**\n\n`);
    md.appendMarkdown(`Control plane: \`${baseUrl}\``);
    this.tooltip = md;
  }
}

/** A workspace (org) the user belongs to. Expands to that workspace's functions. */
export class WorkspaceNode extends vscode.TreeItem {
  readonly kind = "workspace" as const;
  constructor(
    readonly org: OrgMembership,
    readonly isActive: boolean,
  ) {
    super(org.orgName, Collapsed);
    this.id = `ws:${org.orgId}`;
    this.description = isActive ? `${org.orgSlug} · active` : org.orgSlug;
    this.contextValue = isActive ? "hostfunc.workspace.active" : "hostfunc.workspace";
    this.iconPath = new vscode.ThemeIcon(
      "organization",
      isActive ? new vscode.ThemeColor("charts.green") : undefined,
    );
    const md = new vscode.MarkdownString(undefined, true);
    md.appendMarkdown(`**${org.orgName}**\n\n`);
    md.appendMarkdown(`- Slug: \`${org.orgSlug}\`\n- Role: \`${org.role}\`\n`);
    if (isActive) md.appendMarkdown("\n_Active workspace_");
    this.tooltip = md;
  }
}

/** A function row. Carries its org so command handlers act against the right workspace. */
export class FunctionNode extends vscode.TreeItem {
  readonly kind = "function" as const;
  constructor(
    readonly fn: FunctionSummary,
    readonly orgId: string,
  ) {
    super(fn.slug, Collapsed);
    this.id = `${orgId}:${fn.id}`;
    this.contextValue = "hostfunc.function";
    this.description = describeStatus(fn);
    this.tooltip = buildTooltip(fn);
    this.iconPath = statusIcon(fn);
    this.command = { command: "hostfunc.openFunction", title: "Open Function", arguments: [this] };
  }
}

/** A collapsible group under a function (Triggers / Recent runs / Secrets / Versions). */
export class GroupNode extends vscode.TreeItem {
  readonly kind = "group" as const;
  constructor(
    readonly group: GroupKind,
    readonly fnId: string,
    readonly orgId: string,
  ) {
    super(GROUP_LABELS[group], Collapsed);
    this.contextValue = `hostfunc.group.${group}`;
    this.iconPath = new vscode.ThemeIcon(GROUP_ICONS[group]);
  }
}

/** A read-only metadata leaf derived from the function summary (no fetch). */
export class DetailNode extends vscode.TreeItem {
  readonly kind = "detail" as const;
  constructor(label: string, value: string, icon: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = value;
    this.iconPath = new vscode.ThemeIcon(icon);
    this.contextValue = "hostfunc.detail";
  }
}

export class TriggerNode extends vscode.TreeItem {
  readonly kind = "trigger" as const;
  constructor(readonly trigger: TriggerSummary) {
    super(trigger.kind, vscode.TreeItemCollapsibleState.None);
    this.description = triggerSummary(trigger);
    this.iconPath = new vscode.ThemeIcon(TRIGGER_ICONS[trigger.kind] ?? "zap");
    this.contextValue = "hostfunc.trigger";
    const md = new vscode.MarkdownString(undefined, true);
    md.appendMarkdown(
      `**${trigger.kind} trigger** — ${trigger.enabled ? "enabled" : "disabled"}\n\n`,
    );
    md.appendCodeblock(JSON.stringify(trigger.config, null, 2), "json");
    this.tooltip = md;
  }
}

export class ExecutionNode extends vscode.TreeItem {
  readonly kind = "execution" as const;
  constructor(
    readonly exec: ExecutionSummary,
    readonly orgId: string,
  ) {
    super(relativeTime(exec.startedAt), vscode.TreeItemCollapsibleState.None);
    this.id = `exec:${exec.id}`;
    const err = exec.errorCode ? ` · ${exec.errorCode}` : "";
    this.description = `${exec.triggerKind} · ${exec.wallMs}ms${err}`;
    this.iconPath = executionIcon(exec.status);
    this.contextValue = "hostfunc.execution";
    this.command = { command: "hostfunc.viewLogs", title: "View Logs", arguments: [this] };
    const md = new vscode.MarkdownString(undefined, true);
    md.appendMarkdown(`**Execution** \`${exec.id}\`\n\n`);
    md.appendMarkdown(`- Status: \`${exec.status}\`\n- Trigger: \`${exec.triggerKind}\`\n`);
    md.appendMarkdown(`- Wall: \`${exec.wallMs}ms\` · CPU: \`${exec.cpuMs}ms\`\n`);
    md.appendMarkdown(`- Started: \`${exec.startedAt}\`\n`);
    if (exec.errorMessage) md.appendMarkdown(`\n${exec.errorMessage}`);
    this.tooltip = md;
  }
}

/** A secret KEY (never its value). */
export class SecretNode extends vscode.TreeItem {
  readonly kind = "secret" as const;
  constructor(readonly secret: SecretKeySummary) {
    super(secret.key, vscode.TreeItemCollapsibleState.None);
    this.description = `updated ${relativeTime(secret.updatedAt)}`;
    this.iconPath = new vscode.ThemeIcon("key");
    this.contextValue = "hostfunc.secret";
  }
}

export class VersionNode extends vscode.TreeItem {
  readonly kind = "version" as const;
  constructor(readonly version: VersionSummary) {
    super(version.sha256.slice(0, 8), vscode.TreeItemCollapsibleState.None);
    this.description = `${version.status} · ${formatBytes(version.sizeBytes)} · ${relativeTime(version.createdAt)}`;
    this.iconPath = new vscode.ThemeIcon(version.status === "deployed" ? "rocket" : "git-commit");
    this.contextValue = "hostfunc.version";
  }
}

/** A non-actionable placeholder: loading, empty, or error. */
export class PlaceholderNode extends vscode.TreeItem {
  readonly kind = "placeholder" as const;
  constructor(label: string, icon: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(icon);
  }
}

const GROUP_LABELS: Record<GroupKind, string> = {
  triggers: "Triggers",
  runs: "Recent runs",
  secrets: "Secrets",
  versions: "Versions",
};
const GROUP_ICONS: Record<GroupKind, string> = {
  triggers: "zap",
  runs: "history",
  secrets: "key",
  versions: "versions",
};
const TRIGGER_ICONS: Record<string, string> = {
  http: "globe",
  cron: "clock",
  email: "mail",
  mcp: "tools",
};

function describeStatus(fn: FunctionSummary): string {
  return `${fn.visibility} · ${fn.currentVersionId ? "deployed" : "draft"}`;
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
  return executionIcon(fn.latestExecutionStatus ?? "ok");
}

function executionIcon(status: ExecutionStatus): vscode.ThemeIcon {
  switch (status) {
    case "fn_error":
    case "infra_error":
      return new vscode.ThemeIcon("error", new vscode.ThemeColor("errorForeground"));
    case "limit_exceeded":
      return new vscode.ThemeIcon("warning", new vscode.ThemeColor("editorWarning.foreground"));
    default:
      return new vscode.ThemeIcon("pass-filled", new vscode.ThemeColor("testing.iconPassed"));
  }
}

function triggerSummary(t: TriggerSummary): string {
  const c = t.config;
  const detail =
    t.kind === "cron"
      ? String(c.schedule ?? "")
      : t.kind === "email"
        ? String(c.address ?? "")
        : t.kind === "mcp"
          ? String(c.toolName ?? "")
          : c.requireAuth
            ? "auth required"
            : "public";
  return [detail, t.enabled ? "" : "disabled"].filter(Boolean).join(" · ");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** A compact "3m ago" / "2d ago" relative time from an ISO timestamp. */
export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export class FunctionsTreeProvider implements vscode.TreeDataProvider<HfNode> {
  private readonly didChange = new vscode.EventEmitter<HfNode | undefined>();
  readonly onDidChangeTreeData = this.didChange.event;
  /** One client per org, so expanding several functions in a workspace reuses a single token. */
  private readonly clients = new Map<string, HostfuncApiClient>();

  constructor(private readonly auth: AuthManager) {
    auth.onDidChangeAuth(() => this.refresh());
  }

  /** Full refresh — drops the per-org client cache so the active workspace is re-evaluated. */
  refresh(): void {
    this.clients.clear();
    this.didChange.fire(undefined);
  }

  /** Granular refresh of one subtree (e.g. a function after deploy/run) without re-minting tokens. */
  refreshNode(node: HfNode): void {
    this.didChange.fire(node);
  }

  getTreeItem(element: HfNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: HfNode): Promise<HfNode[]> {
    if (!this.auth.isSignedIn()) return [];
    try {
      if (!element) return await this.rootChildren();
      switch (element.kind) {
        case "workspace":
          return await this.workspaceChildren(element);
        case "function":
          return this.functionChildren(element);
        case "group":
          return await this.groupChildren(element);
        default:
          return [];
      }
    } catch (error) {
      return [new PlaceholderNode(messageOf(error), "error")];
    }
  }

  private async rootChildren(): Promise<HfNode[]> {
    const env = this.auth.environment();
    const active = this.auth.getActiveOrg();
    const orgs = await this.auth.listOrgs();
    const workspaces = orgs
      .slice()
      .sort((a, b) => a.orgName.localeCompare(b.orgName))
      .map((o) => new WorkspaceNode(o, o.orgId === active?.orgId));
    return [new EnvNode(env, this.auth.baseUrl), ...workspaces];
  }

  private async workspaceChildren(ws: WorkspaceNode): Promise<HfNode[]> {
    const client = await this.clientFor(ws.org.orgId);
    const { items } = await client.listFunctions();
    if (items.length === 0) return [new PlaceholderNode("No functions yet", "info")];
    return items
      .slice()
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((fn) => new FunctionNode(fn, ws.org.orgId));
  }

  private functionChildren(node: FunctionNode): HfNode[] {
    const fn = node.fn;
    const version = fn.currentVersionId ? `deployed (${fn.currentVersionId.slice(0, 8)})` : "draft";
    const lastRun = fn.latestExecutionStatus ? ` · last ${fn.latestExecutionStatus}` : "";
    return [
      new DetailNode("Status", version, "pulse"),
      new DetailNode("Executions", `${fn.executionCount ?? 0}${lastRun}`, "graph"),
      new DetailNode("Packages", `${fn.packageCount ?? 0}`, "package"),
      new DetailNode("Env vars", `${fn.envVarCount ?? 0}`, "lock"),
      new GroupNode("triggers", fn.id, node.orgId),
      new GroupNode("runs", fn.id, node.orgId),
      new GroupNode("secrets", fn.id, node.orgId),
      new GroupNode("versions", fn.id, node.orgId),
    ];
  }

  private async groupChildren(group: GroupNode): Promise<HfNode[]> {
    const client = await this.clientFor(group.orgId);
    switch (group.group) {
      case "triggers": {
        const { items } = await client.listTriggers(group.fnId);
        return items.length
          ? items.map((t) => new TriggerNode(t))
          : [new PlaceholderNode("No triggers", "info")];
      }
      case "runs": {
        const { items } = await client.listExecutionsForFunction(group.fnId);
        return items.length
          ? items.map((e) => new ExecutionNode(e, group.orgId))
          : [new PlaceholderNode("No runs yet", "info")];
      }
      case "secrets": {
        const { items } = await client.listSecrets(group.fnId);
        return items.length
          ? items.map((s) => new SecretNode(s))
          : [new PlaceholderNode("No secrets", "info")];
      }
      case "versions": {
        const { items } = await client.listVersions(group.fnId);
        return items.length
          ? items.map((v) => new VersionNode(v))
          : [new PlaceholderNode("No versions", "info")];
      }
    }
  }

  private async clientFor(orgId: string): Promise<HostfuncApiClient> {
    const cached = this.clients.get(orgId);
    if (cached) return cached;
    const client = await this.auth.clientForOrg(orgId);
    this.clients.set(orgId, client);
    return client;
  }

  dispose(): void {
    this.didChange.dispose();
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
