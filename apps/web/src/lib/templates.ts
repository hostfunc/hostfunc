export type TemplateCategory =
  | "utilities"
  | "ai"
  | "data"
  | "storage"
  | "integrations"
  | "notifications"
  | "webhooks"
  | "automation";

export interface TemplateTrigger {
  /** The trigger kind the template is designed for. */
  kind: "http" | "cron" | "email";
  /** Cron expression — present only when `kind` is `"cron"`. */
  schedule?: string;
  /** Human-readable guidance shown in the create flow. */
  hint: string;
}

export interface TemplateAsset {
  /** Relative path within the function, e.g. "index.html". */
  path: string;
  /** MIME type — drives how the asset is classified and served. */
  mime: string;
  /** UTF-8 text content written to the asset when the function is created. */
  content: string;
}

export interface FunctionTemplateDefinition {
  id: string;
  name: string;
  icon: string;
  category: TemplateCategory;
  description: string;
  /** Tailwind classes for the template's icon badge. */
  accentClass: string;
  /** Complete, deploy-ready function source. */
  code: string;
  /** Secrets the function reads via `secret.getRequired` — `[]` when none. */
  requiredSecrets: string[];
  /** The trigger this template expects, surfaced as a hint on creation. */
  trigger: TemplateTrigger;
  /** Files attached to the function on creation, e.g. a served index.html. */
  assets?: TemplateAsset[];
}

const HTTP_HINT = "Triggered over HTTP — send a POST with a JSON body, or use query params.";

export const FUNCTION_TEMPLATES: FunctionTemplateDefinition[] = [
  {
    id: "hello-world",
    name: "Hello world",
    icon: "👋",
    category: "utilities",
    description: "The minimal starter — typed input, structured logging, JSON out.",
    accentClass: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    requiredSecrets: [],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn from "@hostfunc/sdk";

// HTTP endpoint. POST { "name": "Ada" } — or GET ?name=Ada
export async function main(input: { name?: string }) {
  const name = input.name?.trim() || "world";
  fn.log("info", "hello.invoked", { name });

  return {
    message: \`hello, \${name}\`,
    invokedAt: new Date().toISOString(),
  };
}
`,
  },
  {
    id: "ai-summarizer",
    name: "AI text summarizer",
    icon: "🤖",
    category: "ai",
    description: "Condense long text into a few sentences with the built-in AI.",
    accentClass: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30",
    requiredSecrets: [],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn from "@hostfunc/sdk";
import { askAi } from "@hostfunc/sdk/ai";

// HTTP endpoint. POST { "text": "...", "sentences": 3 }
export async function main(input: { text?: string; sentences?: number }) {
  const text = input.text?.trim();
  if (!text) {
    return { summary: "", note: "Provide 'text' to summarize." };
  }

  const sentences = Math.min(Math.max(input.sentences ?? 3, 1), 8);
  const answer = await askAi(text, {
    system: \`Summarize the user's text in at most \${sentences} sentences. Be factual and concise.\`,
    maxTokens: 400,
  });

  fn.log("info", "summary.created", { inputChars: text.length });
  return { summary: answer.text, model: answer.model, usage: answer.usage };
}
`,
  },
  {
    id: "slack-notify",
    name: "Slack notifier",
    icon: "💬",
    category: "integrations",
    description: "Post formatted alerts to a Slack channel via an incoming webhook.",
    accentClass: "bg-teal-500/10 text-teal-300 border-teal-500/30",
    requiredSecrets: ["SLACK_WEBHOOK_URL"],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn, { secret } from "@hostfunc/sdk";

// HTTP endpoint. POST { "text": "Deploy finished", "title": "CI", "level": "info" }
// Secret: SLACK_WEBHOOK_URL — a Slack incoming-webhook URL.
export async function main(input: { text?: string; title?: string; level?: string }) {
  if (!input.text) {
    throw new Error("Provide 'text' to send to Slack.");
  }

  const emoji =
    input.level === "error"
      ? ":red_circle:"
      : input.level === "warn"
        ? ":warning:"
        : ":white_check_mark:";

  const webhookUrl = await secret.getRequired("SLACK_WEBHOOK_URL");
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: \`\${emoji} *\${input.title ?? "Notification"}*: \${input.text}\`,
    }),
  });

  fn.log(res.ok ? "info" : "error", "slack.notified", { status: res.status });
  return { ok: res.ok, status: res.status };
}
`,
  },
  {
    id: "webhook-inspector",
    name: "Webhook inspector",
    icon: "📥",
    category: "webhooks",
    description: "Catch, log, and echo any inbound webhook to see exactly what it sends.",
    accentClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    requiredSecrets: [],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn from "@hostfunc/sdk";

// HTTP endpoint. Point any webhook here to inspect its payload.
export async function main(input: Record<string, unknown>) {
  const keys = Object.keys(input ?? {});
  fn.log("info", "webhook.received", { keyCount: keys.length, keys });

  return {
    ok: true,
    receivedAt: new Date().toISOString(),
    payloadKeys: keys,
    payload: input,
  };
}
`,
  },
  {
    id: "html-page",
    name: "HTML page",
    icon: "🖼️",
    category: "utilities",
    description: "Serve a styled web page — ships with an editable, live-previewable index.html.",
    accentClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    requiredSecrets: [],
    trigger: {
      kind: "http",
      hint: "The attached index.html renders as a live web page at the function's public URL.",
    },
    code: `import fn from "@hostfunc/sdk";

// The index.html asset attached to this function is served as a live web
// page at its public URL. main() handles API / non-HTML requests.
export async function main(input: { format?: string }) {
  fn.log("info", "html-page.api", { format: input.format ?? "json" });
  return {
    page: "index.html",
    message: "Edit index.html in the file tree — the preview updates live.",
    renderedAt: new Date().toISOString(),
  };
}
`,
    assets: [
      {
        path: "index.html",
        mime: "text/html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>hostfunc · HTML page</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; margin: 0; }
      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        background: radial-gradient(circle at 50% -10%, #211d18, #0b0a09 60%);
        color: #f3eee2;
      }
      .card {
        max-width: 460px;
        text-align: center;
        padding: 40px 36px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.02);
        box-shadow: 0 30px 80px -40px rgba(0, 0, 0, 0.9);
      }
      .badge {
        display: inline-block;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #ffc56b;
        border: 1px solid rgba(255, 197, 107, 0.3);
        border-radius: 999px;
        padding: 5px 12px;
      }
      h1 { margin: 20px 0 10px; font-size: 38px; line-height: 1.1; }
      p { color: #b9b2a3; line-height: 1.6; font-size: 15px; }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #ffc56b;
        background: rgba(255, 197, 107, 0.1);
        padding: 1px 6px;
        border-radius: 6px;
      }
      .clock {
        margin: 22px 0 18px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 30px;
        color: #f3eee2;
      }
      button {
        font: inherit;
        cursor: pointer;
        color: #0b0a09;
        background: #ffc56b;
        border: 0;
        border-radius: 999px;
        padding: 11px 22px;
        font-weight: 600;
        transition: transform 0.12s ease;
      }
      button:hover { transform: translateY(-1px); }
    </style>
  </head>
  <body>
    <main class="card">
      <span class="badge">Served by hostfunc</span>
      <h1>It works.</h1>
      <p>
        This page is the <code>index.html</code> asset attached to your function.
        Edit it in the file tree and the preview updates live.
      </p>
      <div class="clock" id="clock">--:--:--</div>
      <button id="counter" type="button">You have not clicked yet</button>
    </main>
    <script>
      function tick() {
        document.getElementById("clock").textContent = new Date().toLocaleTimeString();
      }
      tick();
      setInterval(tick, 1000);

      var clicks = 0;
      var button = document.getElementById("counter");
      button.addEventListener("click", function () {
        clicks += 1;
        button.textContent = "Clicked " + clicks + (clicks === 1 ? " time" : " times");
      });
    </script>
  </body>
</html>
`,
      },
    ],
  },
  {
    id: "react-app",
    name: "React app",
    icon: "⚛️",
    category: "utilities",
    description:
      "A React + TypeScript web app. client.tsx is precompiled at deploy into a minified, self-hosted bundle — no CDN.",
    accentClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    requiredSecrets: [],
    trigger: {
      kind: "http",
      hint: "index.html loads the precompiled client.js. main() serves API requests to the same URL.",
    },
    code: `import fn from "@hostfunc/sdk";

// The React app (index.html + client.tsx) is served at your public URL.
// client.tsx is bundled into client.js at deploy time. main() handles API
// calls — e.g. the app can fetch its own URL with { "api": true }.
export async function main(input: { api?: boolean }) {
  fn.log("info", "react-app.api", { api: input.api ?? false });
  return { message: "Hello from main()", time: new Date().toISOString() };
}
`,
    assets: [
      {
        path: "index.html",
        mime: "text/html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>hostfunc · React app</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; margin: 0; }
      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        background: radial-gradient(circle at 50% -10%, #112027, #07090b 60%);
        color: #e7f6fb;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="client.js"></script>
  </body>
</html>
`,
      },
      {
        path: "client.tsx",
        mime: "text/tsx",
        content: `import { useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [count, setCount] = useState(0);
  return (
    <main style={{ textAlign: "center", padding: 40 }}>
      <h1 style={{ fontSize: 40 }}>React on hostfunc ⚛️</h1>
      <p style={{ color: "#8fb5c4", marginTop: 8 }}>
        Compiled at deploy time — bundled, minified, served from your own origin.
      </p>
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        style={{
          marginTop: 22,
          padding: "11px 22px",
          borderRadius: 999,
          border: 0,
          cursor: "pointer",
          font: "inherit",
          fontWeight: 600,
          color: "#07090b",
          background: "#5fd0e6",
        }}
      >
        Clicked {count} {count === 1 ? "time" : "times"}
      </button>
    </main>
  );
}

const el = document.getElementById("root");
if (el) createRoot(el).render(<App />);
`,
      },
    ],
  },
  {
    id: "hacker-news-digest",
    name: "Hacker News digest",
    icon: "📰",
    category: "data",
    description: "Pull the current top 10 Hacker News stories on a schedule.",
    accentClass: "bg-orange-500/10 text-orange-300 border-orange-500/30",
    requiredSecrets: [],
    trigger: {
      kind: "cron",
      schedule: "0 13 * * *",
      hint: "Best on a schedule — add a Cron trigger (daily 13:00 UTC) under Settings → Triggers.",
    },
    code: `import fn from "@hostfunc/sdk";

// Cron trigger (suggested: 0 13 * * * — daily at 13:00 UTC).
export async function main() {
  const ids = (await fetch("https://hacker-news.firebaseio.com/v0/topstories.json").then((r) =>
    r.json(),
  )) as number[];

  const stories = (await Promise.all(
    ids.slice(0, 10).map((id) =>
      fetch(\`https://hacker-news.firebaseio.com/v0/item/\${id}.json\`).then((r) => r.json()),
    ),
  )) as Array<{ id: number; title: string; url?: string; score: number; by: string }>;

  const digest = stories.map((story) => ({
    title: story.title,
    url: story.url ?? \`https://news.ycombinator.com/item?id=\${story.id}\`,
    score: story.score,
    by: story.by,
  }));

  fn.log("info", "hn.digest.built", { count: digest.length });
  return { generatedAt: new Date().toISOString(), stories: digest };
}
`,
  },
  {
    id: "ai-agent",
    name: "AI task agent",
    icon: "🦾",
    category: "ai",
    description: "Run a goal-driven, multi-step AI agent and return its result.",
    accentClass: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    requiredSecrets: [],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn from "@hostfunc/sdk";
import { runAgent } from "@hostfunc/sdk/agent";

// HTTP endpoint. POST { "goal": "Research X and summarize the findings" }
export async function main(input: { goal?: string; input?: Record<string, unknown> }) {
  const goal = input.goal?.trim();
  if (!goal) {
    throw new Error("Provide a 'goal' for the agent to pursue.");
  }

  const result = await runAgent({
    name: "hostfunc-task-agent",
    goal,
    maxSteps: 8,
    input: input.input ?? {},
  });

  fn.log("info", "agent.finished", { status: result.status, steps: result.steps.length });
  return {
    status: result.status,
    output: result.output ?? null,
    steps: result.steps.length,
    error: result.error ?? null,
  };
}
`,
  },
  {
    id: "uptime-monitor",
    name: "Uptime monitor",
    icon: "📡",
    category: "notifications",
    description: "Ping a URL on a schedule and alert Slack the moment it goes down.",
    accentClass: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    requiredSecrets: ["SLACK_WEBHOOK_URL"],
    trigger: {
      kind: "cron",
      schedule: "*/5 * * * *",
      hint: "Best on a schedule — add a Cron trigger (every 5 minutes) under Settings → Triggers.",
    },
    code: `import fn, { secret } from "@hostfunc/sdk";

// Cron trigger (suggested: */5 * * * * — every 5 minutes).
// Secret: SLACK_WEBHOOK_URL — a Slack incoming-webhook URL.
const TARGET = "https://example.com/health";

export async function main() {
  let ok = false;
  let status = 0;
  try {
    const res = await fetch(TARGET, { method: "GET", signal: AbortSignal.timeout(10000) });
    ok = res.ok;
    status = res.status;
  } catch (err) {
    fn.log("error", "uptime.unreachable", { target: TARGET, error: (err as Error).message });
  }

  if (!ok) {
    const webhookUrl = await secret.getRequired("SLACK_WEBHOOK_URL");
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: \`:rotating_light: \${TARGET} is DOWN (status \${status})\`,
      }),
    });
  }

  fn.log(ok ? "info" : "error", "uptime.checked", { target: TARGET, ok, status });
  return { target: TARGET, ok, status, checkedAt: new Date().toISOString() };
}
`,
  },
  {
    id: "github-lookup",
    name: "GitHub profile lookup",
    icon: "🐙",
    category: "integrations",
    description: "Fetch a GitHub user's profile and their most recently updated repos.",
    accentClass: "bg-slate-500/10 text-slate-300 border-slate-500/30",
    requiredSecrets: [],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn, { secret } from "@hostfunc/sdk";

// HTTP endpoint. POST { "username": "torvalds" } — or GET ?username=torvalds
// Optional secret: GITHUB_TOKEN — raises the API rate limit from 60/hr to 5000/hr.
export async function main(input: { username?: string }) {
  if (!input.username) {
    throw new Error("Provide a GitHub 'username'.");
  }

  const token = await secret.get("GITHUB_TOKEN");
  const headers: Record<string, string> = { "user-agent": "hostfunc" };
  if (token) {
    headers.authorization = \`Bearer \${token}\`;
  }

  const profileRes = await fetch(\`https://api.github.com/users/\${input.username}\`, { headers });
  if (!profileRes.ok) {
    throw new Error(\`GitHub returned \${profileRes.status} for \${input.username}\`);
  }
  const profile = (await profileRes.json()) as Record<string, unknown>;

  const repos = (await fetch(
    \`https://api.github.com/users/\${input.username}/repos?sort=updated&per_page=5\`,
    { headers },
  ).then((r) => r.json())) as Array<Record<string, unknown>>;

  fn.log("info", "github.looked_up", { username: input.username });
  return {
    login: profile.login,
    name: profile.name,
    bio: profile.bio,
    followers: profile.followers,
    publicRepos: profile.public_repos,
    topRepos: repos.map((repo) => ({
      name: repo.name,
      stars: repo.stargazers_count,
      language: repo.language,
    })),
  };
}
`,
  },
  {
    id: "ai-sentiment",
    name: "AI sentiment classifier",
    icon: "🧠",
    category: "ai",
    description: "Classify text as positive, neutral, or negative with a confidence score.",
    accentClass: "bg-pink-500/10 text-pink-300 border-pink-500/30",
    requiredSecrets: [],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn from "@hostfunc/sdk";
import { askAi } from "@hostfunc/sdk/ai";

// HTTP endpoint. POST { "text": "I absolutely love this product" }
export async function main(input: { text?: string }) {
  const text = input.text?.trim();
  if (!text) {
    return { label: "neutral", confidence: 0 };
  }

  const answer = await askAi(
    \`Classify the sentiment of the text below as "positive", "neutral", or "negative".
Reply with ONLY compact JSON like {"label":"positive","confidence":0.92}.

Text: \${text}\`,
    { maxTokens: 60, temperature: 0 },
  );

  let parsed: { label?: string; confidence?: number } = {};
  try {
    parsed = JSON.parse(answer.text.trim());
  } catch {
    fn.log("warn", "sentiment.parse_failed", { raw: answer.text.slice(0, 120) });
  }

  return {
    label: parsed.label ?? "neutral",
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
  };
}
`,
  },
  {
    id: "signup-enrichment",
    name: "New signup enrichment",
    icon: "🌱",
    category: "webhooks",
    description: "Enrich new-signup webhooks with company context and post them to Slack.",
    accentClass: "bg-green-500/10 text-green-300 border-green-500/30",
    requiredSecrets: ["SLACK_WEBHOOK_URL"],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn, { secret } from "@hostfunc/sdk";

// HTTP endpoint. Wire your auth provider's "new signup" webhook here.
// Secret: SLACK_WEBHOOK_URL — a Slack incoming-webhook URL.
const PERSONAL_DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "icloud.com", "hotmail.com"];

export async function main(input: { email?: string; name?: string }) {
  if (!input.email || !input.email.includes("@")) {
    throw new Error("Signup payload must include a valid 'email'.");
  }

  const domain = (input.email.split("@")[1] ?? "").toLowerCase();
  const isPersonal = PERSONAL_DOMAINS.includes(domain);
  const company = isPersonal || !domain ? null : domain.replace(/\\.[a-z]+$/i, "");
  const label = company ? \`\${input.email} (\${company})\` : input.email;

  const summary = {
    email: input.email,
    name: input.name ?? null,
    domain,
    company,
    accountType: isPersonal ? "personal" : "business",
  };

  const webhookUrl = await secret.getRequired("SLACK_WEBHOOK_URL");
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: \`:wave: New signup: \${label}\` }),
  });

  fn.log("info", "signup.enriched", { domain, accountType: summary.accountType });
  return summary;
}
`,
  },
  {
    id: "weekly-growth-report",
    name: "Weekly growth report",
    icon: "📈",
    category: "automation",
    description: "Compile weekly growth metrics and post a summary to Slack every Monday.",
    accentClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    requiredSecrets: ["SLACK_WEBHOOK_URL"],
    trigger: {
      kind: "cron",
      schedule: "0 9 * * 1",
      hint: "Best on a schedule — add a Cron trigger (Mondays 09:00 UTC) under Settings → Triggers.",
    },
    code: `import fn, { secret } from "@hostfunc/sdk";

// Cron trigger (suggested: 0 9 * * 1 — Mondays at 09:00 UTC).
// Replace fetchMetrics() with your own data source or another hostfunc function:
//   const data = await fn.executeFunction("your-org/metrics-snapshot", {});
// Secret: SLACK_WEBHOOK_URL — a Slack incoming-webhook URL.
async function fetchMetrics() {
  return { signups: 128, activeUsers: 1042, revenue: 5400, priorSignups: 96 };
}

export async function main() {
  const m = await fetchMetrics();
  const delta =
    m.priorSignups > 0
      ? Math.round(((m.signups - m.priorSignups) / m.priorSignups) * 100)
      : 0;
  const trend = delta >= 0 ? \`▲ \${delta}%\` : \`▼ \${Math.abs(delta)}%\`;

  const text = [
    "*Weekly growth report*",
    \`• Signups: \${m.signups} (\${trend} WoW)\`,
    \`• Active users: \${m.activeUsers}\`,
    \`• Revenue: $\${m.revenue}\`,
  ].join("\\n");

  const webhookUrl = await secret.getRequired("SLACK_WEBHOOK_URL");
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });

  fn.log("info", "growth.report.sent", { signups: m.signups, delta });
  return { ok: res.ok, signups: m.signups, deltaPct: delta };
}
`,
  },
  {
    id: "telegram-bot",
    name: "Telegram bot",
    icon: "✈️",
    category: "integrations",
    description: "Handle Telegram messages and commands, replying through the Bot API.",
    accentClass: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    requiredSecrets: ["TELEGRAM_BOT_TOKEN"],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn, { secret } from "@hostfunc/sdk";

// HTTP endpoint. Register it as your bot's webhook via the Telegram setWebhook API.
// Secret: TELEGRAM_BOT_TOKEN — issued by @BotFather.
export async function main(input: {
  message?: { chat?: { id?: number }; text?: string; from?: { first_name?: string } };
}) {
  const message = input.message;
  const chatId = message?.chat?.id;
  if (!chatId || !message?.text) {
    return { ok: true, skipped: "no message text" };
  }

  const name = message.from?.first_name ?? "there";
  const text = message.text.trim();
  const reply =
    text === "/start"
      ? \`Hi \${name}! Send me any message and I'll echo it back.\`
      : \`You said: \${text}\`;

  const token = await secret.getRequired("TELEGRAM_BOT_TOKEN");
  const res = await fetch(\`https://api.telegram.org/bot\${token}/sendMessage\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: reply }),
  });

  fn.log("info", "telegram.replied", { chatId, status: res.status });
  return { ok: res.ok };
}
`,
  },
  {
    id: "ai-slackbot",
    name: "AI Slack bot",
    icon: "🤝",
    category: "ai",
    description: "Answer Slack questions with AI and post the reply back to the channel.",
    accentClass: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    requiredSecrets: ["SLACK_WEBHOOK_URL"],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn, { secret } from "@hostfunc/sdk";
import { askAi } from "@hostfunc/sdk/ai";

// HTTP endpoint. Connect a Slack workflow or Events API webhook that posts
// JSON like { "text": "your question", "user": "U0123" }.
// Secret: SLACK_WEBHOOK_URL — incoming-webhook URL for the reply channel.
export async function main(input: { text?: string; user?: string }) {
  const question = input.text?.trim();
  if (!question) {
    return { ok: false, note: "No 'text' in payload." };
  }

  const answer = await askAi(question, {
    system: "You are a concise, friendly Slack assistant. Answer in under 80 words.",
    maxTokens: 300,
  });

  const webhookUrl = await secret.getRequired("SLACK_WEBHOOK_URL");
  const reply = input.user ? \`<@\${input.user}> \${answer.text}\` : answer.text;
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: reply }),
  });

  fn.log("info", "slackbot.answered", { status: res.status });
  return { ok: res.ok, answer: answer.text };
}
`,
  },
  {
    id: "webhook-relay",
    name: "Webhook relay",
    icon: "🔀",
    category: "webhooks",
    description: "Fan one inbound webhook out to multiple downstream destinations.",
    accentClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    requiredSecrets: [],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn, { secret } from "@hostfunc/sdk";

// HTTP endpoint. Fans an inbound payload out to several destinations.
// Targets come from the request ("targets": [...]) or the optional
// RELAY_TARGETS secret (a comma-separated list of URLs).
export async function main(input: { targets?: string[]; payload?: unknown }) {
  const fromSecret = (await secret.get("RELAY_TARGETS"))
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const targets = input.targets ?? fromSecret ?? [];

  if (targets.length === 0) {
    throw new Error("No relay targets configured.");
  }

  const body = JSON.stringify(input.payload ?? {});
  const results = await Promise.all(
    targets.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        });
        return { url, ok: res.ok, status: res.status };
      } catch (err) {
        return { url, ok: false, error: (err as Error).message };
      }
    }),
  );

  const delivered = results.filter((r) => r.ok).length;
  fn.log("info", "webhook.relayed", { delivered, total: targets.length });
  return { delivered, total: targets.length, results };
}
`,
  },
  {
    id: "url-unfurl",
    name: "URL unfurler",
    icon: "🔗",
    category: "utilities",
    description: "Extract the title, description, and OG image from any web page.",
    accentClass: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    requiredSecrets: [],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn from "@hostfunc/sdk";

// HTTP endpoint. POST { "url": "https://example.com" }
export async function main(input: { url?: string }) {
  if (!input.url) {
    throw new Error("Provide a 'url' to unfurl.");
  }

  const res = await fetch(input.url, { headers: { "user-agent": "hostfunc-unfurl" } });
  const html = await res.text();
  const pick = (re: RegExp) => html.match(re)?.[1]?.trim() ?? null;

  const meta = {
    url: input.url,
    status: res.status,
    title: pick(/<title[^>]*>([^<]*)/i),
    description: pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i),
    image: pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)/i),
    siteName: pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)/i),
  };

  fn.log("info", "url.unfurled", { url: input.url, ok: res.ok });
  return meta;
}
`,
  },
  {
    id: "keyword-monitor",
    name: "Keyword monitor",
    icon: "🔭",
    category: "notifications",
    description: "Watch Hacker News for keyword mentions and alert Slack on new hits.",
    accentClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    requiredSecrets: ["SLACK_WEBHOOK_URL"],
    trigger: {
      kind: "cron",
      schedule: "0 */6 * * *",
      hint: "Best on a schedule — add a Cron trigger (every 6 hours) under Settings → Triggers.",
    },
    code: `import fn, { secret } from "@hostfunc/sdk";

// Cron trigger (suggested: 0 */6 * * * — every 6 hours).
// Secret: SLACK_WEBHOOK_URL — a Slack incoming-webhook URL.
const KEYWORDS = ["hostfunc", "serverless functions"];

export async function main() {
  const since = Math.floor(Date.now() / 1000) - 6 * 60 * 60;
  const hits: Array<{ title: string; url: string; keyword: string }> = [];

  for (const keyword of KEYWORDS) {
    const endpoint =
      \`https://hn.algolia.com/api/v1/search_by_date?query=\${encodeURIComponent(keyword)}\` +
      \`&tags=story&numericFilters=created_at_i>\${since}\`;
    const data = (await fetch(endpoint).then((r) => r.json())) as {
      hits?: Array<{ title?: string; url?: string; objectID: string }>;
    };
    for (const hit of data.hits ?? []) {
      hits.push({
        title: hit.title ?? "(untitled)",
        url: hit.url ?? \`https://news.ycombinator.com/item?id=\${hit.objectID}\`,
        keyword,
      });
    }
  }

  if (hits.length > 0) {
    const webhookUrl = await secret.getRequired("SLACK_WEBHOOK_URL");
    const lines = hits.map((h) => \`• <\${h.url}|\${h.title}> (\${h.keyword})\`).join("\\n");
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: \`New mentions:\\n\${lines}\` }),
    });
  }

  fn.log("info", "keyword.monitor.done", { hits: hits.length });
  return { checkedAt: new Date().toISOString(), hits };
}
`,
  },
  {
    id: "send-email",
    name: "Transactional email",
    icon: "✉️",
    category: "integrations",
    description: "Send transactional email through Resend from a simple JSON request.",
    accentClass: "bg-teal-500/10 text-teal-300 border-teal-500/30",
    requiredSecrets: ["RESEND_API_KEY"],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn, { secret } from "@hostfunc/sdk";

// HTTP endpoint. POST { "to": "user@example.com", "subject": "Hi", "html": "<p>...</p>" }
// Secret: RESEND_API_KEY — from resend.com. Use a verified domain for "from".
export async function main(input: {
  to?: string;
  subject?: string;
  html?: string;
  from?: string;
}) {
  if (!input.to || !input.subject) {
    throw new Error("Provide at least 'to' and 'subject'.");
  }

  const apiKey = await secret.getRequired("RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: \`Bearer \${apiKey}\`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: input.from ?? "onboarding@resend.dev",
      to: input.to,
      subject: input.subject,
      html: input.html ?? \`<p>\${input.subject}</p>\`,
    }),
  });

  const result = (await res.json()) as { id?: string };
  fn.log(res.ok ? "info" : "error", "email.sent", { to: input.to, status: res.status });
  return { ok: res.ok, id: result.id ?? null };
}
`,
  },
  {
    id: "ai-knowledge-search",
    name: "AI knowledge search",
    icon: "🔎",
    category: "ai",
    description: "Index documents as embeddings, then run semantic search over them.",
    accentClass: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30",
    requiredSecrets: [],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn from "@hostfunc/sdk";
import { createEmbedding } from "@hostfunc/sdk/ai";
import { getNamespace } from "@hostfunc/sdk/vector";

// HTTP endpoint. Two modes:
//   index:  { "action": "index", "documents": [{ "id": "1", "text": "..." }] }
//   search: { "action": "search", "query": "how do I deploy?" }
export async function main(input: {
  action?: "index" | "search";
  documents?: Array<{ id: string; text: string }>;
  query?: string;
}) {
  const store = getNamespace("knowledge-base");

  if (input.action === "index") {
    const docs = input.documents ?? [];
    const vectors = await Promise.all(
      docs.map(async (doc) => {
        const embedding = await createEmbedding(doc.text);
        return { id: doc.id, values: embedding.embedding, metadata: { text: doc.text } };
      }),
    );
    await store.upsert(vectors);
    fn.log("info", "knowledge.indexed", { count: vectors.length });
    return { indexed: vectors.length };
  }

  const query = input.query?.trim();
  if (!query) {
    throw new Error("Provide a 'query' to search, or { action: 'index' } to add documents.");
  }

  const embedded = await createEmbedding(query);
  const result = await store.query(embedded.embedding, { topK: 5 });
  return {
    query,
    matches: result.matches.map((m) => ({
      id: m.id,
      score: m.score,
      text: m.metadata?.text ?? null,
    })),
  };
}
`,
  },
  {
    id: "lead-enrichment-api",
    name: "Lead enrichment API",
    icon: "🧲",
    category: "integrations",
    description: "A REST endpoint that enriches a lead from its email domain.",
    accentClass: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    requiredSecrets: ["ENRICHMENT_API_KEY"],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn, { secret } from "@hostfunc/sdk";

// HTTP endpoint. POST { "email": "ada@acme.com" }
// Secret: ENRICHMENT_API_KEY — a bearer token for your enrichment provider
// (Clearbit, Apollo, People Data Labs, or your own service).
export async function main(input: { email?: string }) {
  if (!input.email || !input.email.includes("@")) {
    throw new Error("Provide a valid 'email' to enrich.");
  }

  const domain = (input.email.split("@")[1] ?? "").toLowerCase();
  const apiKey = await secret.getRequired("ENRICHMENT_API_KEY");

  // Swap this URL for your provider's company-enrichment endpoint.
  const res = await fetch(\`https://api.enrichment.example/v1/company?domain=\${domain}\`, {
    headers: { authorization: \`Bearer \${apiKey}\` },
  });
  const enriched = res.ok ? ((await res.json()) as Record<string, unknown>) : {};

  fn.log("info", "lead.enriched", { domain, providerStatus: res.status });
  return {
    email: input.email,
    domain,
    company: enriched.name ?? domain,
    industry: enriched.industry ?? null,
    employees: enriched.employees ?? null,
    enrichedAt: new Date().toISOString(),
  };
}
`,
  },
  {
    id: "analytics-event-forwarder",
    name: "Analytics event forwarder",
    icon: "📊",
    category: "webhooks",
    description: "Receive product events and forward them into your analytics pipeline.",
    accentClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    requiredSecrets: ["ANALYTICS_WEBHOOK_URL"],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn, { secret } from "@hostfunc/sdk";

// HTTP endpoint. POST { "event": "signup", "userId": "u_1", "properties": {} }
// Secret: ANALYTICS_WEBHOOK_URL — the ingest endpoint events are posted to.
export async function main(input: {
  event?: string;
  userId?: string;
  properties?: Record<string, unknown>;
}) {
  if (!input.event) {
    throw new Error("Provide an 'event' name to forward.");
  }

  const ingestUrl = await secret.getRequired("ANALYTICS_WEBHOOK_URL");
  const res = await fetch(ingestUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      event: input.event,
      userId: input.userId ?? null,
      properties: input.properties ?? {},
      forwardedAt: new Date().toISOString(),
    }),
  });

  fn.log(res.ok ? "info" : "error", "analytics.forwarded", {
    event: input.event,
    status: res.status,
  });
  return { ok: res.ok, status: res.status, event: input.event };
}
`,
  },
  {
    id: "currency-converter",
    name: "Currency converter",
    icon: "💱",
    category: "data",
    description: "Convert between currencies using live exchange rates — no API key.",
    accentClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    requiredSecrets: [],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn from "@hostfunc/sdk";

// HTTP endpoint. POST { "from": "USD", "to": "EUR", "amount": 100 }
// Uses the free Frankfurter exchange-rate API — no API key required.
export async function main(input: { from?: string; to?: string; amount?: number }) {
  const from = (input.from ?? "USD").toUpperCase();
  const to = (input.to ?? "EUR").toUpperCase();
  const amount = input.amount ?? 1;

  const res = await fetch(
    \`https://api.frankfurter.app/latest?from=\${from}&to=\${to}&amount=\${amount}\`,
  );
  if (!res.ok) {
    throw new Error(\`Exchange-rate lookup failed (\${res.status}).\`);
  }

  const data = (await res.json()) as { rates?: Record<string, number>; date?: string };
  const converted = data.rates?.[to] ?? null;

  fn.log("info", "currency.converted", { from, to, amount });
  return { from, to, amount, converted, rateDate: data.date ?? null };
}
`,
  },
  {
    id: "rss-aggregator",
    name: "RSS aggregator",
    icon: "📻",
    category: "data",
    description: "Merge several RSS/Atom feeds into one reverse-chronological digest.",
    accentClass: "bg-orange-500/10 text-orange-300 border-orange-500/30",
    requiredSecrets: [],
    trigger: {
      kind: "cron",
      schedule: "0 * * * *",
      hint: "Best on a schedule — add a Cron trigger (hourly) under Settings → Triggers.",
    },
    code: `import fn from "@hostfunc/sdk";

// Cron trigger (suggested: 0 * * * * — hourly).
const FEEDS = ["https://hnrss.org/frontpage", "https://www.reddit.com/r/programming/.rss"];

export async function main() {
  const items: Array<{ title: string; link: string; feed: string }> = [];

  for (const feed of FEEDS) {
    try {
      const xml = await fetch(feed, { headers: { "user-agent": "hostfunc-rss" } }).then((r) =>
        r.text(),
      );
      const blocks = xml.split(/<(?:item|entry)[ >]/i).slice(1);
      for (const block of blocks.slice(0, 10)) {
        const title = block.match(/<title[^>]*>([^]*?)<\\/title>/i)?.[1] ?? "";
        const link =
          block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ??
          block.match(/<link[^>]*>([^<]+)<\\/link>/i)?.[1] ??
          "";
        items.push({
          title: title.replaceAll("<![CDATA[", "").replaceAll("]]>", "").trim(),
          link: link.trim(),
          feed,
        });
      }
    } catch (err) {
      fn.log("warn", "rss.feed_failed", { feed, error: (err as Error).message });
    }
  }

  fn.log("info", "rss.aggregated", { count: items.length });
  return { generatedAt: new Date().toISOString(), items };
}
`,
  },
  {
    id: "json-transformer",
    name: "JSON transformer",
    icon: "🔧",
    category: "utilities",
    description: "Normalize and annotate an arbitrary JSON payload — a composable building block.",
    accentClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    requiredSecrets: [],
    trigger: { kind: "http", hint: HTTP_HINT },
    code: `import fn from "@hostfunc/sdk";

// HTTP endpoint. POST any JSON object — it comes back normalized and annotated.
export async function main(input: Record<string, unknown>) {
  const keys = Object.keys(input ?? {}).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of keys) {
    normalized[key] = input[key];
  }

  fn.log("info", "json.transformed", { keyCount: keys.length });
  return {
    ...normalized,
    _meta: {
      keyCount: keys.length,
      keys,
      receivedAt: new Date().toISOString(),
    },
  };
}
`,
  },
  {
    id: "stargazer-leads",
    name: "GitHub stargazer leads",
    icon: "⭐",
    category: "automation",
    description: "Turn a repo's newest GitHub stargazers into warm sales leads in Slack.",
    accentClass: "bg-lime-500/10 text-lime-300 border-lime-500/30",
    requiredSecrets: ["GITHUB_TOKEN", "SLACK_WEBHOOK_URL"],
    trigger: {
      kind: "cron",
      schedule: "0 8 * * *",
      hint: "Best on a schedule — add a Cron trigger (daily 08:00 UTC) under Settings → Triggers.",
    },
    code: `import fn, { secret } from "@hostfunc/sdk";

// Cron trigger (suggested: 0 8 * * * — daily at 08:00 UTC).
// Secrets: GITHUB_TOKEN (a personal access token), SLACK_WEBHOOK_URL.
const REPO = "facebook/react";

export async function main() {
  const token = await secret.getRequired("GITHUB_TOKEN");
  const headers = {
    authorization: \`Bearer \${token}\`,
    "user-agent": "hostfunc-stargazer-leads",
    accept: "application/vnd.github.star+json",
  };

  const stargazers = (await fetch(
    \`https://api.github.com/repos/\${REPO}/stargazers?per_page=10\`,
    { headers },
  ).then((r) => r.json())) as Array<{ starred_at?: string; user?: { login: string } }>;

  const leads = [];
  for (const entry of stargazers) {
    const login = entry.user?.login;
    if (!login) continue;
    const profile = (await fetch(\`https://api.github.com/users/\${login}\`, { headers }).then((r) =>
      r.json(),
    )) as Record<string, unknown>;
    leads.push({
      login,
      name: profile.name ?? null,
      company: profile.company ?? null,
      followers: profile.followers ?? 0,
      starredAt: entry.starred_at ?? null,
    });
  }

  if (leads.length > 0) {
    const webhookUrl = await secret.getRequired("SLACK_WEBHOOK_URL");
    const lines = leads
      .map((l) => {
        const co = l.company ? \` — \${l.company}\` : "";
        return \`• \${l.name ?? l.login}\${co} (\${l.followers} followers)\`;
      })
      .join("\\n");
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: \`New stargazers of \${REPO}:\\n\${lines}\` }),
    });
  }

  fn.log("info", "stargazer.leads.done", { count: leads.length });
  return { repo: REPO, leads };
}
`,
  },
  {
    id: "poll",
    name: "Live poll",
    icon: "🗳️",
    category: "storage",
    description: "A live voting page with real-time results — state in the built-in kv store.",
    accentClass: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    requiredSecrets: [],
    trigger: {
      kind: "http",
      hint: "The attached index.html renders the poll at the function's public URL.",
    },
    code: `import fn from "@hostfunc/sdk";
import { kv } from "@hostfunc/sdk/kv";

// The attached index.html renders a live poll at your public URL.
// POST { "action": "vote", "option": "tabs" } records a vote;
// POST { "action": "results" } returns the tally.
// Edit OPTIONS (and the question in index.html) to make it your own.
const OPTIONS = ["tabs", "spaces"];

export async function main(input: { action?: string; option?: string }) {
  if (input.action === "vote") {
    const option = OPTIONS.find((o) => o === input.option);
    if (!option) {
      return { ok: false, error: \`Unknown option — expected one of: \${OPTIONS.join(", ")}\` };
    }
    const votes = await kv.incr(\`vote:\${option}\`);
    fn.log("info", "poll.vote", { option, votes });
    return { ok: true, option, votes };
  }

  const counts = await kv.getMany<number>(OPTIONS.map((o) => \`vote:\${o}\`));
  const results = OPTIONS.map((o) => ({ option: o, votes: counts[\`vote:\${o}\`] ?? 0 }));
  return { ok: true, results };
}
`,
    assets: [
      {
        path: "index.html",
        mime: "text/html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Quick poll</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; margin: 0; }
      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        background: radial-gradient(circle at 50% -10%, #1d1826, #0b0910 60%);
        color: #f0ecf7;
      }
      .card {
        width: 100%;
        max-width: 440px;
        padding: 36px 32px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.02);
      }
      .badge {
        display: inline-block;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #c9a6ff;
        border: 1px solid rgba(201, 166, 255, 0.3);
        border-radius: 999px;
        padding: 5px 12px;
      }
      h1 { margin: 18px 0 6px; font-size: 30px; }
      p { color: #b0a8c2; font-size: 14px; line-height: 1.6; }
      .options { margin-top: 22px; display: grid; gap: 10px; }
      button {
        font: inherit;
        cursor: pointer;
        color: #f0ecf7;
        background: rgba(201, 166, 255, 0.08);
        border: 1px solid rgba(201, 166, 255, 0.25);
        border-radius: 14px;
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
      }
      button:disabled { cursor: default; opacity: 0.85; }
      .bar {
        position: relative;
        height: 6px;
        margin-top: 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        overflow: hidden;
      }
      .bar span {
        position: absolute;
        inset: 0 auto 0 0;
        width: 0%;
        background: #c9a6ff;
        border-radius: 999px;
        transition: width 0.4s ease;
      }
      .meta { display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px; color: #b0a8c2; }
      .total { margin-top: 18px; font-size: 12px; color: #8f86a3; }
    </style>
  </head>
  <body>
    <main class="card">
      <span class="badge">Live poll · hostfunc</span>
      <h1>Tabs or spaces?</h1>
      <p>Votes persist in the built-in <b>kv</b> store — every visitor sees live results.</p>
      <div class="options" id="options"></div>
      <div class="total" id="total"></div>
    </main>
    <script>
      var voted = localStorage.getItem("poll-voted");

      function api(body) {
        return fetch(window.location.pathname, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }).then(function (r) { return r.json(); });
      }

      function render(results) {
        var total = results.reduce(function (sum, r) { return sum + r.votes; }, 0);
        var root = document.getElementById("options");
        root.innerHTML = "";
        results.forEach(function (r) {
          var pct = total > 0 ? Math.round((r.votes / total) * 100) : 0;
          var btn = document.createElement("button");
          btn.type = "button";
          btn.disabled = Boolean(voted);
          btn.innerHTML =
            r.option +
            '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
            '<div class="meta"><span>' + r.votes + ' votes</span><span>' + pct + "%</span></div>";
          btn.addEventListener("click", function () {
            if (voted) return;
            voted = r.option;
            localStorage.setItem("poll-voted", r.option);
            api({ action: "vote", option: r.option }).then(refresh);
          });
          root.appendChild(btn);
        });
        document.getElementById("total").textContent =
          total + " total vote" + (total === 1 ? "" : "s") + (voted ? " · you voted " + voted : "");
      }

      function refresh() {
        api({ action: "results" }).then(function (data) {
          if (data && data.results) render(data.results);
        });
      }

      refresh();
      setInterval(refresh, 5000);
    </script>
  </body>
</html>
`,
      },
    ],
  },
  {
    id: "guestbook",
    name: "Guestbook",
    icon: "📖",
    category: "storage",
    description: "A signable guestbook page — entries persist in the built-in kv store.",
    accentClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    requiredSecrets: [],
    trigger: {
      kind: "http",
      hint: "The attached index.html renders the guestbook at the function's public URL.",
    },
    code: `import fn from "@hostfunc/sdk";
import { kv } from "@hostfunc/sdk/kv";

// The attached index.html renders a guestbook at your public URL.
// POST { "action": "sign", "name": "Ada", "message": "Hi!" } adds an entry;
// POST { "action": "entries" } returns the latest 20.
export async function main(input: { action?: string; name?: string; message?: string }) {
  if (input.action === "sign") {
    const name = input.name?.trim().slice(0, 40);
    const message = input.message?.trim().slice(0, 280);
    if (!name || !message) {
      return { ok: false, error: "Provide both 'name' and 'message'." };
    }
    // Invert the timestamp so kv.list (ascending) returns newest entries first.
    const sortKey = String(9999999999999 - Date.now()).padStart(13, "0");
    await kv.set(\`entry:\${sortKey}\`, { name, message, signedAt: new Date().toISOString() });
    fn.log("info", "guestbook.signed", { name });
    return { ok: true };
  }

  const { keys } = await kv.list({ prefix: "entry:", limit: 20 });
  const byKey = await kv.getMany<{ name: string; message: string; signedAt: string }>(keys);
  return { ok: true, entries: keys.map((k) => byKey[k]).filter(Boolean) };
}
`,
    assets: [
      {
        path: "index.html",
        mime: "text/html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Guestbook</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; margin: 0; }
      body {
        min-height: 100vh;
        display: flex;
        justify-content: center;
        padding: 40px 24px;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        background: radial-gradient(circle at 50% -10%, #241d12, #0d0a06 60%);
        color: #f5efe2;
      }
      .wrap { width: 100%; max-width: 520px; }
      .badge {
        display: inline-block;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #ffcf7d;
        border: 1px solid rgba(255, 207, 125, 0.3);
        border-radius: 999px;
        padding: 5px 12px;
      }
      h1 { margin: 18px 0 6px; font-size: 30px; }
      p.sub { color: #c2b69e; font-size: 14px; line-height: 1.6; }
      form {
        margin-top: 22px;
        display: grid;
        gap: 10px;
        padding: 20px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.02);
      }
      input, textarea {
        font: inherit;
        color: #f5efe2;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 10px 12px;
        resize: vertical;
      }
      button {
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        color: #0d0a06;
        background: #ffcf7d;
        border: 0;
        border-radius: 999px;
        padding: 11px 22px;
        justify-self: start;
      }
      button:disabled { opacity: 0.6; cursor: default; }
      .entries { margin-top: 26px; display: grid; gap: 12px; }
      .entry {
        padding: 14px 16px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.02);
      }
      .entry .who { font-weight: 600; color: #ffcf7d; font-size: 14px; }
      .entry .msg { margin-top: 4px; font-size: 14px; line-height: 1.5; color: #e8dfc9; }
      .entry .when { margin-top: 6px; font-size: 11px; color: #8f8571; }
      .empty { color: #8f8571; font-size: 14px; text-align: center; padding: 18px 0; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <span class="badge">Guestbook · hostfunc</span>
      <h1>Sign the guestbook</h1>
      <p class="sub">Entries persist in the function's built-in <b>kv</b> store.</p>
      <form id="form">
        <input id="name" maxlength="40" placeholder="Your name" required />
        <textarea id="message" rows="3" maxlength="280" placeholder="Leave a note…" required></textarea>
        <button id="submit" type="submit">Sign</button>
      </form>
      <div class="entries" id="entries"><div class="empty">Loading…</div></div>
    </div>
    <script>
      function api(body) {
        return fetch(window.location.pathname, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }).then(function (r) { return r.json(); });
      }

      function render(entries) {
        var root = document.getElementById("entries");
        root.innerHTML = "";
        if (!entries.length) {
          var empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = "No entries yet — be the first to sign.";
          root.appendChild(empty);
          return;
        }
        entries.forEach(function (e) {
          var card = document.createElement("div");
          card.className = "entry";
          var who = document.createElement("div");
          who.className = "who";
          who.textContent = e.name;
          var msg = document.createElement("div");
          msg.className = "msg";
          msg.textContent = e.message;
          var when = document.createElement("div");
          when.className = "when";
          when.textContent = new Date(e.signedAt).toLocaleString();
          card.appendChild(who);
          card.appendChild(msg);
          card.appendChild(when);
          root.appendChild(card);
        });
      }

      function refresh() {
        api({ action: "entries" }).then(function (data) {
          if (data && data.entries) render(data.entries);
        });
      }

      document.getElementById("form").addEventListener("submit", function (event) {
        event.preventDefault();
        var button = document.getElementById("submit");
        button.disabled = true;
        api({
          action: "sign",
          name: document.getElementById("name").value,
          message: document.getElementById("message").value,
        }).then(function () {
          document.getElementById("message").value = "";
          button.disabled = false;
          refresh();
        });
      });

      refresh();
    </script>
  </body>
</html>
`,
      },
    ],
  },
  {
    id: "link-shortener",
    name: "Link shortener",
    icon: "🔗",
    category: "storage",
    description: "Create short links and 302-redirect visitors — with per-link click counts.",
    accentClass: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    requiredSecrets: [],
    trigger: {
      kind: "http",
      hint: "POST a URL to create a short code; GET ?c=<code> redirects and counts the click.",
    },
    code: `import fn from "@hostfunc/sdk";
import { kv } from "@hostfunc/sdk/kv";

// POST { "url": "https://example.com/some/long/path" } → { code } — share
// your function URL with ?c=<code> appended as the short link.
// GET ?c=<code> → 302-redirects to the stored URL (main can return a raw Response).
// POST { "stats": true } → click counts for every link.
export async function main(input: { url?: string; c?: string; stats?: boolean }) {
  if (input.c) {
    const url = await kv.get<string>(\`link:\${input.c}\`);
    if (!url) {
      return new Response("Unknown link", { status: 404 });
    }
    const clicks = await kv.incr(\`clicks:\${input.c}\`);
    fn.log("info", "shortener.redirect", { code: input.c, clicks });
    return new Response(null, { status: 302, headers: { location: url } });
  }

  if (input.url) {
    let parsed: URL;
    try {
      parsed = new URL(input.url);
    } catch {
      return { ok: false, error: "Provide a valid absolute 'url'." };
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, error: "Only http(s) URLs can be shortened." };
    }
    const code = Math.random().toString(36).slice(2, 8);
    await kv.set(\`link:\${code}\`, parsed.href);
    fn.log("info", "shortener.created", { code });
    return { ok: true, code, shortPath: \`?c=\${code}\`, target: parsed.href };
  }

  const { keys } = await kv.list({ prefix: "link:", limit: 100 });
  const links = await kv.getMany<string>(keys);
  const clickCounts = await kv.getMany<number>(
    keys.map((k) => \`clicks:\${k.slice("link:".length)}\`),
  );
  return {
    ok: true,
    links: keys.map((k) => {
      const code = k.slice("link:".length);
      return { code, target: links[k], clicks: clickCounts[\`clicks:\${code}\`] ?? 0 };
    }),
  };
}
`,
  },
  {
    id: "page-view-counter",
    name: "Page-view counter",
    icon: "📈",
    category: "storage",
    description: "Drop-in view tracking for any site — one fetch() call per page load.",
    accentClass: "bg-lime-500/10 text-lime-300 border-lime-500/30",
    requiredSecrets: [],
    trigger: {
      kind: "http",
      hint: "POST { path } from any page to count a view; GET returns all counts.",
    },
    code: `import fn from "@hostfunc/sdk";
import { kv } from "@hostfunc/sdk/kv";

// Drop-in page-view counter. Add this to any site:
//   fetch("<your function URL>", {
//     method: "POST",
//     headers: { "content-type": "application/json" },
//     body: JSON.stringify({ path: location.pathname }),
//   });
// POST { "path": "/pricing" } → bumps and returns that path's count.
// GET → view counts for every tracked path, most-viewed first.
export async function main(input: { path?: string }) {
  if (input.path) {
    const path = input.path.slice(0, 200);
    const views = await kv.incr(\`views:\${path}\`);
    fn.log("info", "views.tracked", { path, views });
    return { ok: true, path, views };
  }

  const { keys } = await kv.list({ prefix: "views:", limit: 100 });
  const counts = await kv.getMany<number>(keys);
  const pages = keys.map((k) => ({ path: k.slice("views:".length), views: counts[k] ?? 0 }));
  pages.sort((a, b) => b.views - a.views);
  return { ok: true, pages };
}
`,
  },
  {
    id: "waitlist",
    name: "Waitlist signup",
    icon: "📬",
    category: "storage",
    description: "A launch waitlist page — deduped email signups with a live counter.",
    accentClass: "bg-orange-500/10 text-orange-300 border-orange-500/30",
    requiredSecrets: [],
    trigger: {
      kind: "http",
      hint: "The attached index.html renders the signup page at the function's public URL.",
    },
    code: `import fn from "@hostfunc/sdk";
import { kv } from "@hostfunc/sdk/kv";

// The attached index.html renders a waitlist signup page at your public URL.
// POST { "action": "join", "email": "ada@example.com" } adds a signup (deduped);
// POST { "action": "count" } returns the total.
// GET the function URL with ?export=1 … or just open the executions tab to see signups.
export async function main(input: { action?: string; email?: string }) {
  if (input.action === "join") {
    const email = input.email?.trim().toLowerCase();
    if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return { ok: false, error: "Provide a valid 'email'." };
    }
    const existing = await kv.get(\`signup:\${email}\`);
    if (existing) {
      const total = await kv.get<number>("total");
      return { ok: true, alreadyJoined: true, total: total ?? 0 };
    }
    await kv.set(\`signup:\${email}\`, { joinedAt: new Date().toISOString() });
    const total = await kv.incr("total");
    fn.log("info", "waitlist.joined", { total });
    return { ok: true, total };
  }

  const total = await kv.get<number>("total");
  return { ok: true, total: total ?? 0 };
}
`,
    assets: [
      {
        path: "index.html",
        mime: "text/html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Join the waitlist</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; margin: 0; }
      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        background: radial-gradient(circle at 50% -10%, #251710, #0d0805 60%);
        color: #f7ede4;
      }
      .card {
        width: 100%;
        max-width: 460px;
        text-align: center;
        padding: 40px 36px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.02);
      }
      .badge {
        display: inline-block;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #ffb47d;
        border: 1px solid rgba(255, 180, 125, 0.3);
        border-radius: 999px;
        padding: 5px 12px;
      }
      h1 { margin: 20px 0 10px; font-size: 34px; line-height: 1.1; }
      p { color: #c4ac9b; line-height: 1.6; font-size: 15px; }
      form { margin-top: 24px; display: flex; gap: 8px; }
      input {
        flex: 1;
        font: inherit;
        color: #f7ede4;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        padding: 11px 18px;
      }
      button {
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        color: #0d0805;
        background: #ffb47d;
        border: 0;
        border-radius: 999px;
        padding: 11px 22px;
        white-space: nowrap;
      }
      button:disabled { opacity: 0.6; cursor: default; }
      .note { margin-top: 16px; font-size: 13px; color: #a08872; min-height: 18px; }
      .count { margin-top: 6px; font-size: 13px; color: #ffb47d; }
    </style>
  </head>
  <body>
    <main class="card">
      <span class="badge">Waitlist · hostfunc</span>
      <h1>Something new is coming.</h1>
      <p>Leave your email and be first in line. Signups are stored in the function's built-in <b>kv</b> store.</p>
      <form id="form">
        <input id="email" type="email" placeholder="you@example.com" required />
        <button id="submit" type="submit">Join</button>
      </form>
      <div class="note" id="note"></div>
      <div class="count" id="count"></div>
    </main>
    <script>
      function api(body) {
        return fetch(window.location.pathname, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }).then(function (r) { return r.json(); });
      }

      function showCount(total) {
        if (typeof total === "number" && total > 0) {
          document.getElementById("count").textContent =
            total + (total === 1 ? " person is" : " people are") + " already on the list";
        }
      }

      document.getElementById("form").addEventListener("submit", function (event) {
        event.preventDefault();
        var button = document.getElementById("submit");
        var note = document.getElementById("note");
        button.disabled = true;
        api({ action: "join", email: document.getElementById("email").value }).then(function (data) {
          button.disabled = false;
          if (!data.ok) {
            note.textContent = data.error || "Something went wrong — try again.";
            return;
          }
          note.textContent = data.alreadyJoined
            ? "You're already on the list ✓"
            : "You're in — see you at launch ✓";
          showCount(data.total);
        });
      });

      api({ action: "count" }).then(function (data) {
        if (data && data.ok) showCount(data.total);
      });
    </script>
  </body>
</html>
`,
      },
    ],
  },
  {
    id: "feedback-widget",
    name: "Feedback widget",
    icon: "💌",
    category: "storage",
    description: "Collect ratings and comments on a hosted page — optionally forwarded to Slack.",
    accentClass: "bg-pink-500/10 text-pink-300 border-pink-500/30",
    requiredSecrets: [],
    trigger: {
      kind: "http",
      hint: "The attached index.html renders the feedback form at the function's public URL.",
    },
    code: `import fn, { secret } from "@hostfunc/sdk";
import { kv } from "@hostfunc/sdk/kv";

// The attached index.html renders a feedback form at your public URL.
// POST { "action": "submit", "message": "...", "rating": 5 } stores feedback;
// POST { "action": "recent" } returns the latest 20 entries.
// Optional secret: SLACK_WEBHOOK_URL — set it to also forward feedback to Slack.
export async function main(input: { action?: string; message?: string; rating?: number }) {
  if (input.action === "submit") {
    const message = input.message?.trim().slice(0, 500);
    if (!message) return { ok: false, error: "Provide 'message'." };
    const rating = Math.min(Math.max(Math.round(input.rating ?? 0), 0), 5);
    // Invert the timestamp so kv.list (ascending) returns newest entries first.
    const sortKey = String(9999999999999 - Date.now()).padStart(13, "0");
    await kv.set(\`feedback:\${sortKey}\`, { message, rating, at: new Date().toISOString() });

    const webhookUrl = await secret.get("SLACK_WEBHOOK_URL");
    if (webhookUrl) {
      const stars = rating > 0 ? "★".repeat(rating) : "unrated";
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: \`New feedback (\${stars}): \${message}\` }),
      });
    }
    fn.log("info", "feedback.submitted", { rating });
    return { ok: true };
  }

  const { keys } = await kv.list({ prefix: "feedback:", limit: 20 });
  const byKey = await kv.getMany<{ message: string; rating: number; at: string }>(keys);
  return { ok: true, feedback: keys.map((k) => byKey[k]).filter(Boolean) };
}
`,
    assets: [
      {
        path: "index.html",
        mime: "text/html",
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Send feedback</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; margin: 0; }
      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        background: radial-gradient(circle at 50% -10%, #241318, #0d0709 60%);
        color: #f7e9ee;
      }
      .card {
        width: 100%;
        max-width: 440px;
        padding: 36px 32px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.02);
      }
      .badge {
        display: inline-block;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #ff9dbf;
        border: 1px solid rgba(255, 157, 191, 0.3);
        border-radius: 999px;
        padding: 5px 12px;
      }
      h1 { margin: 18px 0 6px; font-size: 28px; }
      p { color: #c4a3b1; font-size: 14px; line-height: 1.6; }
      .stars { margin-top: 20px; display: flex; gap: 6px; }
      .stars button {
        font-size: 26px;
        line-height: 1;
        background: none;
        border: 0;
        cursor: pointer;
        color: rgba(255, 157, 191, 0.25);
        padding: 2px;
        transition: transform 0.1s ease;
      }
      .stars button:hover { transform: scale(1.15); }
      .stars button.lit { color: #ff9dbf; }
      textarea {
        margin-top: 14px;
        width: 100%;
        font: inherit;
        color: #f7e9ee;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px 14px;
        resize: vertical;
      }
      .send {
        margin-top: 14px;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        color: #0d0709;
        background: #ff9dbf;
        border: 0;
        border-radius: 999px;
        padding: 11px 24px;
      }
      .send:disabled { opacity: 0.6; cursor: default; }
      .note { margin-top: 12px; font-size: 13px; color: #a37c8d; min-height: 18px; }
    </style>
  </head>
  <body>
    <main class="card">
      <span class="badge">Feedback · hostfunc</span>
      <h1>How are we doing?</h1>
      <p>Ratings and comments are stored in the built-in <b>kv</b> store — and forwarded to Slack when a webhook secret is set.</p>
      <div class="stars" id="stars"></div>
      <textarea id="message" rows="4" maxlength="500" placeholder="Tell us what's working and what isn't…"></textarea>
      <button class="send" id="send" type="button">Send feedback</button>
      <div class="note" id="note"></div>
    </main>
    <script>
      var rating = 0;
      var starsRoot = document.getElementById("stars");

      function paintStars() {
        Array.prototype.forEach.call(starsRoot.children, function (star, index) {
          star.className = index < rating ? "lit" : "";
        });
      }

      for (var i = 1; i <= 5; i++) {
        (function (value) {
          var star = document.createElement("button");
          star.type = "button";
          star.textContent = "★";
          star.addEventListener("click", function () {
            rating = value;
            paintStars();
          });
          starsRoot.appendChild(star);
        })(i);
      }

      document.getElementById("send").addEventListener("click", function () {
        var button = document.getElementById("send");
        var note = document.getElementById("note");
        button.disabled = true;
        fetch(window.location.pathname, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "submit",
            message: document.getElementById("message").value,
            rating: rating,
          }),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            button.disabled = false;
            if (!data.ok) {
              note.textContent = data.error || "Something went wrong — try again.";
              return;
            }
            document.getElementById("message").value = "";
            rating = 0;
            paintStars();
            note.textContent = "Thanks — feedback received ✓";
          });
      });
    </script>
  </body>
</html>
`,
      },
    ],
  },
  {
    id: "neon-postgres-crud",
    name: "Neon Postgres CRUD",
    icon: "🐘",
    category: "data",
    description: "A notes API on your own Neon Postgres — the serverless driver works over HTTP.",
    accentClass: "bg-green-500/10 text-green-300 border-green-500/30",
    requiredSecrets: ["NEON_DATABASE_URL"],
    trigger: {
      kind: "http",
      hint: "Set the NEON_DATABASE_URL secret, then POST { action: 'create' | 'list' | 'update' | 'delete' }.",
    },
    code: `import fn, { secret } from "@hostfunc/sdk";
import { neon } from "@neondatabase/serverless";

// A tiny notes API backed by your own Neon Postgres. The Neon serverless
// driver queries over HTTPS, so it runs anywhere fetch does — no TCP needed.
// Secret: NEON_DATABASE_URL — copy the connection string from your Neon
// dashboard (Connection Details → Connection string).
// POST { "action": "create", "text": "hello" }   → insert a note
// POST { "action": "list" } (or GET)             → latest 50 notes
// POST { "action": "update", "id": 1, "text": "…" }
// POST { "action": "delete", "id": 1 }
export async function main(input: { action?: string; id?: number; text?: string }) {
  const sql = neon(await secret.getRequired("NEON_DATABASE_URL"));
  await sql\`CREATE TABLE IF NOT EXISTS notes (
    id serial PRIMARY KEY,
    text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )\`;

  switch (input.action) {
    case "create": {
      const text = input.text?.trim();
      if (!text) return { ok: false, error: "Provide 'text'." };
      const [note] = await sql\`INSERT INTO notes (text) VALUES (\${text}) RETURNING *\`;
      fn.log("info", "notes.created", { id: note?.id });
      return { ok: true, note };
    }
    case "update": {
      const text = input.text?.trim();
      if (!input.id || !text) return { ok: false, error: "Provide 'id' and 'text'." };
      const [note] = await sql\`UPDATE notes SET text = \${text} WHERE id = \${input.id} RETURNING *\`;
      return note ? { ok: true, note } : { ok: false, error: "No such note." };
    }
    case "delete": {
      if (!input.id) return { ok: false, error: "Provide 'id'." };
      const deleted = await sql\`DELETE FROM notes WHERE id = \${input.id} RETURNING id\`;
      return { ok: deleted.length > 0 };
    }
    default: {
      const notes = await sql\`SELECT * FROM notes ORDER BY created_at DESC LIMIT 50\`;
      fn.log("info", "notes.listed", { count: notes.length });
      return { ok: true, notes };
    }
  }
}
`,
  },
  {
    id: "supabase-rest",
    name: "Supabase todos",
    icon: "⚡",
    category: "data",
    description: "Read and write a Supabase table with supabase-js — fetch-based and edge-safe.",
    accentClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    requiredSecrets: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
    trigger: {
      kind: "http",
      hint: "Set the SUPABASE_URL and SUPABASE_ANON_KEY secrets, then POST { action: 'add' | 'toggle' | 'list' }.",
    },
    code: `import fn, { secret } from "@hostfunc/sdk";
import { createClient } from "@supabase/supabase-js";

// A todos API on your own Supabase project. supabase-js talks to the REST
// API over fetch, so it runs in any serverless runtime.
// Secrets: SUPABASE_URL (https://<project>.supabase.co) and SUPABASE_ANON_KEY —
// both on your project's Settings → API page.
// One-time setup in the Supabase SQL editor:
//   create table if not exists todos (
//     id bigint generated always as identity primary key,
//     task text not null,
//     done boolean not null default false
//   );
//   -- then either disable RLS for this demo, or add anon read/write policies.
// POST { "action": "add", "task": "ship it" } | { "action": "toggle", "id": 1 } | { "action": "list" }
export async function main(input: { action?: string; id?: number; task?: string }) {
  const supabase = createClient(
    await secret.getRequired("SUPABASE_URL"),
    await secret.getRequired("SUPABASE_ANON_KEY"),
  );

  if (input.action === "add") {
    const task = input.task?.trim();
    if (!task) return { ok: false, error: "Provide 'task'." };
    const { data, error } = await supabase.from("todos").insert({ task }).select().single();
    if (error) throw new Error(error.message);
    fn.log("info", "todos.added", { id: data.id });
    return { ok: true, todo: data };
  }

  if (input.action === "toggle") {
    if (!input.id) return { ok: false, error: "Provide 'id'." };
    const { data: current, error: readError } = await supabase
      .from("todos")
      .select("done")
      .eq("id", input.id)
      .single();
    if (readError) throw new Error(readError.message);
    const { data, error } = await supabase
      .from("todos")
      .update({ done: !current.done })
      .eq("id", input.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, todo: data };
  }

  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("id", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return { ok: true, todos: data };
}
`,
  },
  {
    id: "upstash-redis-cache",
    name: "Upstash Redis cache",
    icon: "🧊",
    category: "data",
    description: "Cache slow upstream calls in Upstash Redis over its REST API, with a TTL.",
    accentClass: "bg-red-500/10 text-red-300 border-red-500/30",
    requiredSecrets: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    trigger: {
      kind: "http",
      hint: "Set the Upstash REST secrets, then POST { city } — repeat calls are served from cache.",
    },
    code: `import fn, { secret } from "@hostfunc/sdk";
import { Redis } from "@upstash/redis";

// Cache slow upstream calls in your own Upstash Redis. The client uses the
// REST API (plain fetch), so it works in any serverless runtime.
// Secrets: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN — both on the
// database's page in the Upstash console (REST API section).
// POST { "city": "London" } — the first call hits the weather API; calls in
// the next 10 minutes are served from cache.
interface Conditions {
  temperatureC: number | null;
  windKmh: number | null;
}

export async function main(input: { city?: string }) {
  const city = input.city?.trim() || "London";
  const redis = new Redis({
    url: await secret.getRequired("UPSTASH_REDIS_REST_URL"),
    token: await secret.getRequired("UPSTASH_REDIS_REST_TOKEN"),
  });

  const cacheKey = \`weather:\${city.toLowerCase()}\`;
  const cached = await redis.get<Conditions>(cacheKey);
  if (cached) {
    fn.log("info", "cache.hit", { city });
    return { city, ...cached, cache: "hit" };
  }

  const geo = (await fetch(
    \`https://geocoding-api.open-meteo.com/v1/search?name=\${encodeURIComponent(city)}&count=1\`,
  ).then((r) => r.json())) as { results?: Array<{ latitude: number; longitude: number }> };
  const place = geo.results?.[0];
  if (!place) return { ok: false, error: \`Unknown city: \${city}\` };

  const weather = (await fetch(
    \`https://api.open-meteo.com/v1/forecast?latitude=\${place.latitude}&longitude=\${place.longitude}&current_weather=true\`,
  ).then((r) => r.json())) as { current_weather?: { temperature: number; windspeed: number } };
  const conditions: Conditions = {
    temperatureC: weather.current_weather?.temperature ?? null,
    windKmh: weather.current_weather?.windspeed ?? null,
  };

  await redis.set(cacheKey, conditions, { ex: 600 });
  fn.log("info", "cache.miss", { city });
  return { city, ...conditions, cache: "miss" };
}
`,
  },
  {
    id: "turso-libsql",
    name: "Turso (libSQL) events",
    icon: "🪶",
    category: "data",
    description: "Write and query a Turso database over its HTTP pipeline — zero dependencies.",
    accentClass: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    requiredSecrets: ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"],
    trigger: {
      kind: "http",
      hint: "Set the Turso secrets, then POST { action: 'track', event } or { action: 'summary' }.",
    },
    code: `import fn, { secret } from "@hostfunc/sdk";

// A tiny event tracker on your own Turso (libSQL) database, using the raw
// HTTP pipeline API — no driver dependency at all.
// Secrets: TURSO_DATABASE_URL (https://<db>-<org>.turso.io) and TURSO_AUTH_TOKEN
// (turso db tokens create <db>).
// POST { "action": "track", "event": "signup" } → record an event
// POST { "action": "summary" } (or GET)         → counts per event
interface TursoResult {
  results: Array<{
    type: string;
    response?: { result?: { cols?: Array<{ name: string }>; rows?: Array<Array<{ value: string }>> } };
  }>;
}

async function execute(sql: string, args: string[] = []): Promise<TursoResult> {
  const url = await secret.getRequired("TURSO_DATABASE_URL");
  const token = await secret.getRequired("TURSO_AUTH_TOKEN");
  const res = await fetch(\`\${url}/v2/pipeline\`, {
    method: "POST",
    headers: { authorization: \`Bearer \${token}\`, "content-type": "application/json" },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: args.map((value) => ({ type: "text", value })) } },
        { type: "close" },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(\`turso request failed (\${res.status}): \${await res.text()}\`);
  }
  return (await res.json()) as TursoResult;
}

export async function main(input: { action?: string; event?: string }) {
  await execute(
    "CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, at TEXT NOT NULL)",
  );

  if (input.action === "track") {
    const name = input.event?.trim().slice(0, 60);
    if (!name) return { ok: false, error: "Provide 'event'." };
    await execute("INSERT INTO events (name, at) VALUES (?, ?)", [name, new Date().toISOString()]);
    fn.log("info", "events.tracked", { name });
    return { ok: true, event: name };
  }

  const result = await execute(
    "SELECT name, COUNT(*) AS total FROM events GROUP BY name ORDER BY total DESC LIMIT 50",
  );
  const rows = result.results[0]?.response?.result?.rows ?? [];
  const summary = rows.map((row) => ({ event: row[0]?.value, total: Number(row[1]?.value ?? 0) }));
  return { ok: true, summary };
}
`,
  },
];

export const TEMPLATE_IDS = FUNCTION_TEMPLATES.map((template) => template.id);

export const TEMPLATES: Record<string, string> = Object.fromEntries(
  FUNCTION_TEMPLATES.map((template) => [template.id, template.code]),
);
