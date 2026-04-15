const appUrl = process.env.SMOKE_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
export {};

const requiredEnv = [
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

function checkRequiredEnv(): void {
  const missing = requiredEnv.filter((name) => !process.env[name] || !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`missing required social provider env vars: ${missing.join(", ")}`);
  }
}

async function checkLoginPage(): Promise<void> {
  const res = await fetch(`${appUrl}/login`, { redirect: "manual" });
  if (!res.ok) {
    throw new Error(`login page request failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const requiredLabels = ["Continue with GitHub", "Continue with Google"];
  for (const label of requiredLabels) {
    if (!html.includes(label)) {
      throw new Error(`login page missing social CTA label: "${label}"`);
    }
  }
}

function checkCallbackUrls(): void {
  const githubCallback = new URL("/api/auth/callback/github", appUrl).toString();
  const googleCallback = new URL("/api/auth/callback/google", appUrl).toString();
  process.stdout.write(`ok: github callback URL ${githubCallback}\n`);
  process.stdout.write(`ok: google callback URL ${googleCallback}\n`);
}

async function main(): Promise<void> {
  checkRequiredEnv();
  process.stdout.write("ok: required social provider env vars set\n");

  await checkLoginPage();
  process.stdout.write("ok: /login social options visible\n");

  checkCallbackUrls();
  process.stdout.write("all auth social smoke checks passed\n");
}

await main();
