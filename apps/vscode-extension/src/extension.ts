import * as vscode from "vscode";
import { AuthManager } from "./auth.js";
import { registerCommands } from "./commands.js";
import { LocalSync } from "./local.js";
import { RunLogChannel } from "./logs.js";
import { FunctionsTreeProvider } from "./views/functions-tree.js";

export function activate(context: vscode.ExtensionContext): void {
  const auth = new AuthManager(context);
  const tree = new FunctionsTreeProvider(auth);
  const runLog = new RunLogChannel();
  const local = new LocalSync(context, auth);

  context.subscriptions.push(
    auth,
    tree,
    runLog,
    vscode.window.registerTreeDataProvider("hostfunc.functions", tree),
  );

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  context.subscriptions.push(status);

  let busyLabel: string | null = null;
  const renderStatus = () => {
    if (busyLabel) {
      status.text = `$(sync~spin) ${busyLabel}`;
      status.command = undefined;
      status.tooltip = busyLabel;
    } else if (auth.isSignedIn()) {
      const org = auth.getActiveOrg();
      status.text = `$(globe) hostfunc: ${org?.orgName ?? "workspace"}`;
      status.command = "hostfunc.switchOrg";
      status.tooltip = "Switch hostfunc workspace";
    } else {
      status.text = "$(sign-in) hostfunc: Sign in";
      status.command = "hostfunc.signIn";
      status.tooltip = "Sign in to hostfunc";
    }
    status.show();
  };

  const syncContext = () => {
    void vscode.commands.executeCommand("setContext", "hostfunc.signedIn", auth.isSignedIn());
    renderStatus();
  };

  context.subscriptions.push(auth.onDidChangeAuth(syncContext));

  // Save-to-server: saving a function's index.ts pushes the draft automatically.
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (vscode.workspace.getConfiguration("hostfunc").get<boolean>("pushOnSave", true)) {
        void local.pushOnSave(doc.uri);
      }
    }),
  );

  registerCommands(context, {
    auth,
    tree,
    runLog,
    local,
    setBusy: (label) => {
      busyLabel = label;
      renderStatus();
    },
  });

  syncContext();
}

export function deactivate(): void {
  // Subscriptions are disposed by VS Code automatically.
}
