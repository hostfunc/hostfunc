#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { hostname, platform } from "node:os";
import process from "node:process";
import { HostfuncApiClient, pollForToken, requestDeviceCode } from "@hostfunc/api-client";
import { CliApi } from "./api.js";
import {
  readCredentials,
  readProjectConfig,
  writeCredentials,
  writeProjectConfig,
} from "./config.js";

const CLI_CLIENT_ID = "hostfunc-cli";

const HELP_TEXT = `hostfunc - CLI for Hostfunc

Usage:
  hostfunc login [--url <baseUrl>]            Sign in via your browser (device flow)
  hostfunc login --token <token> [--url ...]  Sign in with an API token (CI / headless)
  hostfunc init [--url <baseUrl>] [--fnId <id>]
  hostfunc list [--query <text>]
  hostfunc deploy [--fnId <id>]
  hostfunc run [--fnId <id>] [--payload <jsonFile>]
  hostfunc logs [--executionId <id>]
  hostfunc secrets set <KEY> <VALUE> [--fnId <id>]
  hostfunc help

Examples:
  hostfunc login --url https://hostfunc.dev
  hostfunc login --token hfn_live_xxx --url https://hostfunc.dev
  hostfunc init --fnId fn_123
  hostfunc run --payload ./payload.json
`;

class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
  ) {
    super(message);
  }
}

/**
 * The slice of the API surface the CLI actually consumes. Kept structurally loose (vs
 * `Pick<CliApi, …>`) so lightweight test mocks remain valid; the real {@link CliApi} satisfies it.
 */
type CliApiClient = {
  loginCheck(): Promise<unknown>;
  listFunctions(query?: string): Promise<{ items: Array<{ id: string; slug: string }> }>;
  deploy(fnId: string): Promise<{ versionId: string; runUrl: string }>;
  run(fnId: string, payload: Record<string, unknown>): Promise<unknown>;
  logs(executionId?: string): Promise<unknown>;
  setSecret(fnId: string, key: string, value: string): Promise<unknown>;
};

type CliDeps = {
  apiFactory: (baseUrl: string, token: string) => CliApiClient;
  cwd: string;
  stdout: (line: string) => void;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetch: typeof fetch;
  /** Injectable delay for tests; defaults to a real timer (used by the device-flow poller). */
  sleep: (ms: number) => Promise<void>;
  /** Best-effort browser launcher; defaults to the platform `open` command. */
  openBrowser: (url: string) => void;
};

/** Best-effort, non-blocking browser launch. Failures are ignored — the URL is always printed. */
function defaultOpenBrowser(url: string): void {
  const command = platform() === "darwin" ? "open" : platform() === "win32" ? "cmd" : "xdg-open";
  const args = platform() === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();
  } catch {
    // Ignore — the user can open the printed URL manually.
  }
}

export async function runCli(argv: string[], deps?: Partial<CliDeps>): Promise<void> {
  const [, , command = "help", ...args] = argv;
  const cwd = deps?.cwd ?? process.cwd();
  const stdout = deps?.stdout ?? console.log;
  const apiFactory =
    deps?.apiFactory ?? ((baseUrl: string, token: string) => new CliApi(baseUrl, token));
  const fetchImpl = deps?.fetch ?? fetch;
  const sleep = deps?.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const openBrowser = deps?.openBrowser ?? defaultOpenBrowser;

  if (command === "help" || command === "--help" || command === "-h") {
    stdout(HELP_TEXT);
    return;
  }

  if (command === "login") {
    const token = getFlag(args, "--token");
    const baseUrl = getFlag(args, "--url") ?? "http://localhost:3000";

    // Headless / CI path: an explicit API token.
    if (token) {
      const api = apiFactory(baseUrl, token);
      await api.loginCheck();
      await writeCredentials({ token });
      const existing = (await readProjectConfig(cwd)) ?? {};
      await writeProjectConfig(cwd, { ...existing, baseUrl });
      stdout(`Logged in to ${baseUrl}`);
      return;
    }

    // Default path: browser-based device flow (RFC 8628).
    const code = await requestDeviceCode({ baseUrl, clientId: CLI_CLIENT_ID, fetch: fetchImpl });
    stdout("");
    stdout("To authorize the hostfunc CLI, open this URL in your browser:");
    stdout(`  ${code.verification_uri_complete}`);
    stdout(`and confirm the code: ${code.user_code}`);
    stdout("");
    openBrowser(code.verification_uri_complete);
    stdout("Waiting for authorization…");

    const accessToken = await pollForToken({
      baseUrl,
      clientId: CLI_CLIENT_ID,
      deviceCode: code.device_code,
      intervalSeconds: code.interval,
      expiresInSeconds: code.expires_in,
      fetch: fetchImpl,
      sleep,
    });

    const client = new HostfuncApiClient({
      baseUrl,
      getToken: () => accessToken,
      fetch: fetchImpl,
    });
    const exchanged = await client.exchangeDeviceSession(accessToken, { deviceName: hostname() });
    await writeCredentials({ token: exchanged.token });
    const existing = (await readProjectConfig(cwd)) ?? {};
    await writeProjectConfig(cwd, { ...existing, baseUrl });
    stdout(`Logged in to ${exchanged.orgName} (${baseUrl})`);
    return;
  }

  if (command === "init") {
    const baseUrl = getFlag(args, "--url") ?? "http://localhost:3000";
    const fnId = getFlag(args, "--fnId");
    await writeProjectConfig(cwd, { baseUrl, ...(fnId ? { fnId } : {}) });
    stdout("Initialized hostfunc.json");
    return;
  }

  const config = await readProjectConfig(cwd);
  const credentials = await readCredentials();
  if (!config?.baseUrl || !credentials?.token) {
    throw new CliError(
      "missing config or credentials. Run `hostfunc init` and `hostfunc login` first.",
      2,
    );
  }

  const api = apiFactory(config.baseUrl, credentials.token);

  if (command === "list") {
    const query = getFlag(args, "--query");
    const result = await api.listFunctions(query);
    for (const row of result.items) {
      stdout(`${row.id}\t${row.slug}`);
    }
    return;
  }

  if (command === "deploy") {
    const fnId = getFlag(args, "--fnId") ?? config.fnId;
    if (!fnId) throw new CliError("missing fnId; pass --fnId or set it in hostfunc.json", 2);
    const result = await api.deploy(fnId);
    stdout(`Deployed version ${result.versionId}`);
    stdout(result.runUrl);
    return;
  }

  if (command === "run") {
    const fnId = getFlag(args, "--fnId") ?? config.fnId;
    if (!fnId) throw new CliError("missing fnId; pass --fnId or set it in hostfunc.json", 2);
    const payloadPath = getFlag(args, "--payload");
    const payload = payloadPath ? JSON.parse(await readFile(payloadPath, "utf8")) : {};
    const result = await api.run(fnId, payload);
    stdout(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "logs") {
    const executionId = getFlag(args, "--executionId");
    const result = await api.logs(executionId);
    stdout(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "secrets" && args[0] === "set") {
    const fnId = getFlag(args, "--fnId") ?? config.fnId;
    const key = args[1];
    const value = args[2];
    if (!fnId || !key || !value) {
      throw new CliError("usage: hostfunc secrets set <KEY> <VALUE> [--fnId <id>]", 2);
    }
    await api.setSecret(fnId, key, value);
    stdout(`Secret ${key} set`);
    return;
  }

  throw new CliError(`unknown command: ${command}\n\n${HELP_TEXT}`, 2);
}

function getFlag(args: string[], name: string): string | undefined {
  const index = args.findIndex((arg) => arg === name);
  return index >= 0 ? args[index + 1] : undefined;
}

runCli(process.argv).catch((error) => {
  if (error instanceof CliError) {
    console.error(error.message);
    process.exit(error.exitCode);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
