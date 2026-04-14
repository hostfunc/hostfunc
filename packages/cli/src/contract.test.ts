import test from "node:test";
import assert from "node:assert/strict";
import { CliApi } from "./api.js";

const baseUrl = process.env.HOSTFUNC_CLI_TEST_URL;
const token = process.env.HOSTFUNC_CLI_TEST_TOKEN;
const fnId = process.env.HOSTFUNC_CLI_TEST_FN_ID;

test(
  "contract smoke: login + list",
  { skip: !(baseUrl && token) },
  async () => {
    const api = new CliApi(baseUrl as string, token as string);
    await api.loginCheck();
    const functions = (await api.listFunctions()) as { items: unknown[] };
    assert.ok(Array.isArray(functions.items));
  },
);

test(
  "contract smoke: deploy + run + logs + setSecret",
  { skip: !(baseUrl && token && fnId) },
  async () => {
    const api = new CliApi(baseUrl as string, token as string);
    await api.setSecret(fnId as string, "HOSTFUNC_CONTRACT_SMOKE", "ok");
    const deploy = (await api.deploy(fnId as string)) as { runUrl: string };
    assert.equal(typeof deploy.runUrl, "string");
    const runResult = await api.run(fnId as string, { smoke: true });
    assert.ok(runResult);
    const logs = await api.logs();
    assert.ok(logs);
  },
);
