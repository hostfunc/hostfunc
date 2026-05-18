import "server-only";

import { env } from "@/lib/env";

export interface GithubUserRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  archived: boolean;
  default_branch: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  permissions?: Record<string, boolean>;
}

export interface GithubRepoBranch {
  name: string;
}

interface GithubApiErrorShape {
  message?: string;
}

function requireGithubOauthEnv() {
  const clientId = env.GITHUB_INTEGRATIONS_CLIENT_ID ?? env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_INTEGRATIONS_CLIENT_SECRET ?? env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("github_oauth_not_configured");
  }
  return {
    clientId,
    clientSecret,
  };
}

function githubApiBase() {
  return "https://api.github.com";
}

async function githubRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${githubApiBase()}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as GithubApiErrorShape | null;
    throw new Error(`github_api_error:${response.status}:${json?.message ?? "unknown"}`);
  }
  return (await response.json()) as T;
}

export function buildGithubAppInstallUrl(state: string): string {
  const { clientId } = requireGithubOauthEnv();
  const url = new URL("https://github.com/login/oauth/authorize");
  const scopes = env.GITHUB_OAUTH_SCOPES?.trim() || "repo read:org";
  const redirectUri = (
    env.GITHUB_INTEGRATIONS_REDIRECT_URI ?? env.GITHUB_OAUTH_REDIRECT_URI
  )?.trim();
  url.searchParams.set("state", state);
  url.searchParams.set("client_id", clientId);
  if (redirectUri) url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("allow_signup", "false");
  return url.toString();
}

export async function exchangeGithubOauthCodeForToken(input: {
  code: string;
  redirectUri?: string;
}): Promise<string> {
  const { clientId, clientSecret } = requireGithubOauthEnv();
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: input.code,
      ...(input.redirectUri ? { redirect_uri: input.redirectUri } : {}),
    }),
  });
  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as GithubApiErrorShape | null;
    throw new Error(`github_oauth_exchange_error:${response.status}:${json?.message ?? "unknown"}`);
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("github_oauth_token_missing");
  return data.access_token;
}

export async function getGithubAuthenticatedUser(accessToken: string): Promise<{
  login: string;
  type: string;
}> {
  return githubRequest<{ login: string; type: string }>("/user", accessToken);
}

export async function listGithubInstallationRepos(accessToken: string): Promise<GithubUserRepo[]> {
  return githubRequest<GithubUserRepo[]>(
    "/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&sort=updated",
    accessToken,
  );
}

export async function listGithubRepoBranches(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<GithubRepoBranch[]> {
  return githubRequest<GithubRepoBranch[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100`,
    accessToken,
  );
}
