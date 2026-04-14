const appUrl = process.env.SMOKE_APP_URL;
const triggerToken = process.env.TRIGGER_CONTROL_TOKEN;
export {};

if (!appUrl) {
  throw new Error("SMOKE_APP_URL is required");
}

async function check(name: string, input: () => Promise<boolean>) {
  const ok = await input();
  if (!ok) throw new Error(`smoke check failed: ${name}`);
  process.stdout.write(`ok: ${name}\n`);
}

await check("login page", async () => {
  const res = await fetch(`${appUrl}/login`);
  return res.ok;
});

await check("dashboard auth redirect", async () => {
  const res = await fetch(`${appUrl}/dashboard`, { redirect: "manual" });
  return res.status === 307 || res.status === 308;
});

if (triggerToken) {
  await check("observability summary auth", async () => {
    const res = await fetch(`${appUrl}/api/internal/observability/summary`, {
      headers: { authorization: `Bearer ${triggerToken}` },
    });
    return res.ok;
  });
}

process.stdout.write("all critical smoke checks passed\n");
