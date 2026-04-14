import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT_CONFIG_FILE = "hostfunc.json";
const DEFAULT_CREDENTIALS_DIR = join(homedir(), ".hostfunc");
const DEFAULT_CREDENTIALS_FILE = join(DEFAULT_CREDENTIALS_DIR, "credentials.json");

function getCredentialsDir() {
  return process.env.HOSTFUNC_CREDENTIALS_DIR ?? DEFAULT_CREDENTIALS_DIR;
}

function getCredentialsFile() {
  return process.env.HOSTFUNC_CREDENTIALS_FILE ?? DEFAULT_CREDENTIALS_FILE;
}

export interface ProjectConfig {
  baseUrl: string;
  fnId?: string;
}

export interface Credentials {
  token: string;
}

export async function readProjectConfig(cwd: string): Promise<ProjectConfig | null> {
  try {
    const text = await readFile(join(cwd, PROJECT_CONFIG_FILE), "utf8");
    return JSON.parse(text) as ProjectConfig;
  } catch {
    return null;
  }
}

export async function writeProjectConfig(cwd: string, config: ProjectConfig): Promise<void> {
  await writeFile(join(cwd, PROJECT_CONFIG_FILE), JSON.stringify(config, null, 2), "utf8");
}

export async function readCredentials(): Promise<Credentials | null> {
  try {
    const text = await readFile(getCredentialsFile(), "utf8");
    return JSON.parse(text) as Credentials;
  } catch {
    return null;
  }
}

export async function writeCredentials(credentials: Credentials): Promise<void> {
  await mkdir(getCredentialsDir(), { recursive: true });
  await writeFile(getCredentialsFile(), JSON.stringify(credentials, null, 2), "utf8");
}
