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
    // Reuse an existing PAT for this org if we have one; otherwise mint a fresh one.
    const existing = await this.context.secrets.get(tokenSecretKey(org.orgId));
    if (!existing) {
      const minted = await this.client().createOrgToken(org.orgId, hostname());
      await this.persistOrgToken(minted.orgId, minted.token);
    }
    await this.setActiveOrg({ orgId: org.orgId, orgSlug: org.orgSlug, orgName: org.orgName });
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
