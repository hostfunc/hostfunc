export type TemplateCategory =
  | "utilities"
  | "ai"
  | "data"
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
];

export const TEMPLATE_IDS = FUNCTION_TEMPLATES.map((template) => template.id);

export const TEMPLATES: Record<string, string> = Object.fromEntries(
  FUNCTION_TEMPLATES.map((template) => [template.id, template.code]),
);
