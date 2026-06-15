import { hostname } from "node:os";
import {
  DeviceFlowError,
  HostfuncApiClient,
  pollForToken,
  requestDeviceCode,
} from "@hostfunc/api-client";
import type { OrgMembership } from "@hostfunc/api-client";
import * as vscode from "vscode";

const VSCODE_CLIENT_ID = "hostfunc-vscode";

export interface ActiveOrg {
  orgId: string;
  orgSlug: string;
  orgName: string;
}

const ACTIVE_ORG_KEY = "hostfunc.activeOrg";
const ORGS_KEY = "hostfunc.orgs";

function tokenSecretKey(orgId: string): string {
  return `hostfunc.token.${orgId}`;
}

/**
 * Owns authentication state: the per-org `hfn_live_` PATs (in SecretStorage), the active org
 * (in globalState), and the device-flow sign-in. Emits {@link onDidChangeAuth} whenever the signed
 * -in state or active org changes so views can refresh.
 */
export class AuthManager {
  private readonly didChange = new vscode.EventEmitter<void>();
  readonly onDidChangeAuth = this.didChange.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  get baseUrl(): string {
    return vscode.workspace
      .getConfiguration("hostfunc")
      .get<string>("baseUrl", "https://hostfunc.io")
      .replace(/\/+$/, "");
  }

  getActiveOrg(): ActiveOrg | undefined {
    return this.context.globalState.get<ActiveOrg>(ACTIVE_ORG_KEY);
  }

  async getToken(): Promise<string | undefined> {
    const org = this.getActiveOrg();
    if (!org) return undefined;
    return this.context.secrets.get(tokenSecretKey(org.orgId));
  }

  isSignedIn(): boolean {
    return this.getActiveOrg() !== undefined;
  }

  /** A client bound to the active org's PAT. */
  client(): HostfuncApiClient {
    return new HostfuncApiClient({ baseUrl: this.baseUrl, getToken: () => this.getToken() });
  }

  /**
   * A client bound to an arbitrary org's PAT — reusing the cached token, or minting one on first
   * use (and persisting it). Powers per-workspace lazy loading in the tree.
   */
  async clientForOrg(orgId: string): Promise<HostfuncApiClient> {
    const token = await this.tokenForOrg(orgId);
    return new HostfuncApiClient({ baseUrl: this.baseUrl, getToken: () => token });
  }

  /** Reuse the cached PAT for an org, or mint + persist one (mirrors `switchOrg`). */
  private async tokenForOrg(orgId: string): Promise<string> {
    const existing = await this.context.secrets.get(tokenSecretKey(orgId));
    if (existing) return existing;
    const minted = await this.client().createOrgToken(orgId, hostname());
    await this.persistOrgToken(minted.orgId, minted.token);
    return minted.token;
  }

  /** The workspaces the user belongs to (refreshed from the server, cached on failure). */
  listOrgs(): Promise<OrgMembership[]> {
    return this.refreshOrgs();
  }

  /** Classifies the configured control plane into a label + codicon for the environment indicator. */
  environment(): { label: string; icon: string; host: string } {
    let host: string;
    try {
      host = new URL(this.baseUrl).host;
    } catch {
      host = this.baseUrl;
    }
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(host)) {
      return { label: "Local", icon: "vm", host };
    }
    if (/(^|\.)hostfunc\.io$/.test(host)) {
      return { label: "Production", icon: "cloud", host };
    }
    return { label: "Custom", icon: "server", host };
  }

  async signIn(): Promise<void> {
    const baseUrl = this.baseUrl;
    const code = await requestDeviceCode({ baseUrl, clientId: VSCODE_CLIENT_ID });

    const action = await vscode.window.showInformationMessage(
      `Authorize hostfunc in your browser. Confirm this code matches: ${code.user_code}`,
      { modal: true },
      "Open Browser",
      "Copy Code",
    );
    if (action === "Copy Code") {
      await vscode.env.clipboard.writeText(code.user_code);
    }
    await vscode.env.openExternal(vscode.Uri.parse(code.verification_uri_complete));

    const accessToken = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Waiting for authorization…",
        cancellable: true,
      },
      (_progress, cancel) =>
        pollForToken({
          baseUrl,
          clientId: VSCODE_CLIENT_ID,
          deviceCode: code.device_code,
          intervalSeconds: code.interval,
          expiresInSeconds: code.expires_in,
          isCancelled: () => cancel.isCancellationRequested,
        }),
    );

    // Exchange the device-approved session for an org-scoped PAT.
    const bootstrap = new HostfuncApiClient({ baseUrl, getToken: () => accessToken });
    const exchanged = await bootstrap.exchangeDeviceSession(accessToken, {
      deviceName: hostname(),
    });

    await this.persistOrgToken(exchanged.orgId, exchanged.token);
    await this.setActiveOrg({
      orgId: exchanged.orgId,
      orgSlug: exchanged.orgSlug,
      orgName: exchanged.orgName,
    });
    await this.refreshOrgs();
    this.didChange.fire();
  }

  async switchOrg(): Promise<void> {
    const orgs = await this.refreshOrgs();
    if (orgs.length === 0) {
      vscode.window.showWarningMessage("No hostfunc workspaces found for your account.");
      return;
    }
    const active = this.getActiveOrg();
    const picked = await vscode.window.showQuickPick(
      orgs.map((o) => ({
        label: o.orgName,
        description: o.orgSlug + (o.orgId === active?.orgId ? "  (current)" : ""),
        org: o,
      })),
      { title: "Switch hostfunc workspace", placeHolder: "Select a workspace" },
    );
    if (!picked || picked.org.orgId === active?.orgId) return;

    const org = picked.org;
    await this.setActiveOrgById(org.orgId, org.orgSlug, org.orgName);
  }

  /** Make an org active by id — reuses/mints its PAT, persists it, and notifies views. */
  async setActiveOrgById(orgId: string, orgSlug: string, orgName: string): Promise<void> {
    if (this.getActiveOrg()?.orgId === orgId) return;
    await this.tokenForOrg(orgId);
    await this.setActiveOrg({ orgId, orgSlug, orgName });
    this.didChange.fire();
  }

  async signOut(): Promise<void> {
    const orgs = this.context.globalState.get<OrgMembership[]>(ORGS_KEY, []);
    const active = this.getActiveOrg();
    const orgIds = new Set<string>(orgs.map((o) => o.orgId));
    if (active) orgIds.add(active.orgId);
    for (const orgId of orgIds) {
      await this.context.secrets.delete(tokenSecretKey(orgId));
    }
    await this.context.globalState.update(ACTIVE_ORG_KEY, undefined);
    await this.context.globalState.update(ORGS_KEY, undefined);
    this.didChange.fire();
  }

  private async refreshOrgs(): Promise<OrgMembership[]> {
    try {
      const { orgs } = await this.client().listOrgs();
      await this.context.globalState.update(ORGS_KEY, orgs);
      return orgs;
    } catch {
      return this.context.globalState.get<OrgMembership[]>(ORGS_KEY, []);
    }
  }

  private async persistOrgToken(orgId: string, token: string): Promise<void> {
    await this.context.secrets.store(tokenSecretKey(orgId), token);
  }

  private async setActiveOrg(org: ActiveOrg): Promise<void> {
    await this.context.globalState.update(ACTIVE_ORG_KEY, org);
  }

  dispose(): void {
    this.didChange.dispose();
  }

  /** Narrow the device-flow error to a human-friendly message for the caller to surface. */
  static describeError(error: unknown): string {
    if (error instanceof DeviceFlowError) {
      switch (error.code) {
        case "access_denied":
          return "Authorization was denied.";
        case "expired_token":
        case "expired":
          return "The authorization code expired. Try signing in again.";
        case "cancelled":
          return "Sign-in cancelled.";
        default:
          return "Could not complete sign-in. Please try again.";
      }
    }
    return error instanceof Error ? error.message : String(error);
  }
}
