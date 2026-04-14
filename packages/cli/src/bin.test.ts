import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { runCli } from "./bin.js";

function createApiMock() {
  return {
    loginCheck: async () => ({ ok: true }),
    listFunctions: async () => ({ items: [{ id: "fn_1", slug: "hello-world" }] }),
    deploy: async () => ({ versionId: "ver_1", runUrl: "https://run.url" }),
    run: async () => ({ ok: true }),
    logs: async () => ({ items: [] }),
    setSecret: async () => ({ ok: true }),
  };
}

test("prints help output", async () => {
  const output: string[] = [];
  await runCli(["node", "hostfunc", "help"], {
    stdout: (line) => output.push(line),
    apiFactory: () => createApiMock(),
    cwd: process.cwd(),
  });
  assert.match(output.join("\n"), /Usage:/);
  assert.match(output.join("\n"), /hostfunc login/);
});

test("login writes credentials and project config", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "hostfunc-cli-test-"));
  const credsDir = join(cwd, ".creds");
  const credsFile = join(credsDir, "credentials.json");
  process.env.HOSTFUNC_CREDENTIALS_DIR = credsDir;
  process.env.HOSTFUNC_CREDENTIALS_FILE = credsFile;

  const output: string[] = [];
  await runCli(["node", "hostfunc", "login", "--token", "hf_test", "--url", "https://example.test"], {
    stdout: (line) => output.push(line),
    apiFactory: () => createApiMock(),
    cwd,
  });

  const configRaw = await readFile(join(cwd, "hostfunc.json"), "utf8");
  const credsRaw = await readFile(credsFile, "utf8");
  assert.match(output.join("\n"), /Logged in/);
  assert.equal(JSON.parse(configRaw).baseUrl, "https://example.test");
  assert.equal(JSON.parse(credsRaw).token, "hf_test");

  Reflect.deleteProperty(process.env, "HOSTFUNC_CREDENTIALS_DIR");
  Reflect.deleteProperty(process.env, "HOSTFUNC_CREDENTIALS_FILE");
  await rm(cwd, { recursive: true, force: true });
});

test("list uses config and prints functions", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "hostfunc-cli-test-"));
  const credsDir = join(cwd, ".creds");
  const credsFile = join(credsDir, "credentials.json");
  process.env.HOSTFUNC_CREDENTIALS_DIR = credsDir;
  process.env.HOSTFUNC_CREDENTIALS_FILE = credsFile;

  await writeFile(join(cwd, "hostfunc.json"), JSON.stringify({ baseUrl: "https://example.test" }), "utf8");
  await mkdir(credsDir, { recursive: true });
  await writeFile(credsFile, JSON.stringify({ token: "hf_test" }), "utf8");

  const output: string[] = [];
  await runCli(["node", "hostfunc", "list"], {
    stdout: (line) => output.push(line),
    apiFactory: () => createApiMock(),
    cwd,
  });

  assert.match(output.join("\n"), /fn_1\thello-world/);

  Reflect.deleteProperty(process.env, "HOSTFUNC_CREDENTIALS_DIR");
  Reflect.deleteProperty(process.env, "HOSTFUNC_CREDENTIALS_FILE");
  await rm(cwd, { recursive: true, force: true });
});

test("missing config throws usage-style error", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "hostfunc-cli-test-"));
  let message = "";
  try {
    await runCli(["node", "hostfunc", "list"], {
      stdout: () => {},
      apiFactory: () => createApiMock(),
      cwd,
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert.match(message, /missing config or credentials/);
  await rm(cwd, { recursive: true, force: true });
});
