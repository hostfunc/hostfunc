#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import {
  readCredentials,
  readProjectConfig,
  writeCredentials,
  writeProjectConfig,
} from "./config.js";
import { CliApi } from "./api.js";

const HELP_TEXT = `hostfunc - CLI for Hostfunc

Usage:
  hostfunc login --token <token> [--url <baseUrl>]
  hostfunc init [--url <baseUrl>] [--fnId <id>]
  hostfunc list [--query <text>]
  hostfunc deploy [--fnId <id>]
  hostfunc run [--fnId <id>] [--payload <jsonFile>]
  hostfunc logs [--executionId <id>]
  hostfunc secrets set <KEY> <VALUE> [--fnId <id>]
  hostfunc help

Examples:
  hostfunc login --token hf_xxx --url https://hostfunc.dev
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

type CliDeps = {
  apiFactory: (baseUrl: string, token: string) => Pick<
    CliApi,
    "loginCheck" | "listFunctions" | "deploy" | "run" | "logs" | "setSecret"
  >;
  cwd: string;
  stdout: (line: string) => void;
};

export async function runCli(argv: string[], deps?: Partial<CliDeps>): Promise<void> {
  const [, , command = "help", ...args] = argv;
  const cwd = deps?.cwd ?? process.cwd();
  const stdout = deps?.stdout ?? console.log;
  const apiFactory = deps?.apiFactory ?? ((baseUrl: string, token: string) => new CliApi(baseUrl, token));

  if (command === "help" || command === "--help" || command === "-h") {
    stdout(HELP_TEXT);
    return;
  }

  if (command === "login") {
    const token = getFlag(args, "--token");
    const baseUrl = getFlag(args, "--url") ?? "http://localhost:3000";
    if (!token) throw new CliError("missing --token", 2);

    const api = apiFactory(baseUrl, token);
    await api.loginCheck();
    await writeCredentials({ token });
    const existing = (await readProjectConfig(cwd)) ?? {};
    await writeProjectConfig(cwd, { ...existing, baseUrl });
    stdout(`Logged in to ${baseUrl}`);
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
    const result = (await api.listFunctions(query)) as { items: Array<{ id: string; slug: string }> };
    for (const row of result.items) {
      stdout(`${row.id}\t${row.slug}`);
    }
    return;
  }

  if (command === "deploy") {
    const fnId = getFlag(args, "--fnId") ?? config.fnId;
    if (!fnId) throw new CliError("missing fnId; pass --fnId or set it in hostfunc.json", 2);
    const result = (await api.deploy(fnId)) as { versionId: string; runUrl: string };
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
