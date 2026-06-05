import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
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

test("device-flow login exchanges a session for a PAT and stores it", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "hostfunc-cli-test-"));
  const credsDir = join(cwd, ".creds");
  const credsFile = join(credsDir, "credentials.json");
  process.env.HOSTFUNC_CREDENTIALS_DIR = credsDir;
  process.env.HOSTFUNC_CREDENTIALS_FILE = credsFile;

  const fetchMock = async (url: string | URL, _init?: RequestInit) => {
    const u = String(url);
    const json = (body: unknown) =>
      ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
    if (u.endsWith("/api/auth/device/code")) {
      return json({
        device_code: "dev_1",
        user_code: "ABCD-1234",
        verification_uri: "https://example.test/device",
        verification_uri_complete: "https://example.test/device?user_code=ABCD-1234",
        expires_in: 600,
        interval: 1,
      });
    }
    if (u.endsWith("/api/auth/device/token")) {
      return json({ access_token: "sess_abc", token_type: "Bearer" });
    }
    if (u.endsWith("/api/cli/device/exchange")) {
      return json({
        ok: true,
        token: "hfn_live_TESTONLYxxxxxxxxxxxxxxxx",
        orgId: "org_1",
        orgSlug: "acme",
        orgName: "Acme",
        userId: "u1",
      });
    }
    throw new Error(`unexpected url ${u}`);
  };

  const output: string[] = [];
  let openedUrl: string | null = null;
  await runCli(["node", "hostfunc", "login", "--url", "https://example.test"], {
    stdout: (line) => output.push(line),
    cwd,
    fetch: fetchMock as unknown as typeof fetch,
    sleep: async () => {},
    openBrowser: (url) => {
      openedUrl = url;
    },
  });

  const credsRaw = await readFile(credsFile, "utf8");
  assert.equal(JSON.parse(credsRaw).token, "hfn_live_TESTONLYxxxxxxxxxxxxxxxx");
  assert.equal(openedUrl, "https://example.test/device?user_code=ABCD-1234");
  assert.match(output.join("\n"), /Logged in to Acme/);

  Reflect.deleteProperty(process.env, "HOSTFUNC_CREDENTIALS_DIR");
  Reflect.deleteProperty(process.env, "HOSTFUNC_CREDENTIALS_FILE");
  await rm(cwd, { recursive: true, force: true });
});

test("login writes credentials and project config", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "hostfunc-cli-test-"));
  const credsDir = join(cwd, ".creds");
  const credsFile = join(credsDir, "credentials.json");
  process.env.HOSTFUNC_CREDENTIALS_DIR = credsDir;
  process.env.HOSTFUNC_CREDENTIALS_FILE = credsFile;

  const output: string[] = [];
  await runCli(
    ["node", "hostfunc", "login", "--token", "hf_test", "--url", "https://example.test"],
    {
      stdout: (line) => output.push(line),
      apiFactory: () => createApiMock(),
      cwd,
    },
  );

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

  await writeFile(
    join(cwd, "hostfunc.json"),
    JSON.stringify({ baseUrl: "https://example.test" }),
    "utf8",
  );
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
