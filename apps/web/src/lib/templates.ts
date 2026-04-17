export interface FunctionTemplateDefinition {
  id: string;
  name: string;
  icon: string;
  category: "utilities" | "ai" | "data" | "integrations" | "notifications";
  description: string;
  code: string;
  accentClass: string;
}

export const FUNCTION_TEMPLATES: FunctionTemplateDefinition[] = [
  {
    id: "hello-world",
    name: "Hello world",
    icon: "👋",
    category: "utilities",
    description: "The starter.",
    accentClass: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    code: `import fn from "@hostfunc/fn";

export async function main(input: { name?: string }) {
  const name = input.name ?? "world";
  return { message: \`hello, \${name}\` };
}
`,
  },
  {
    id: "webhook-logger",
    name: "Webhook logger",
    icon: "📥",
    category: "utilities",
    description: "Catch + log any POST.",
    accentClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    code: `import fn from "@hostfunc/fn";

export async function main(req: Request) {
  const payload = await req.json();
  fn.log("info", "webhook.received", { type: payload?.type ?? "unknown" });

  return { ok: true, receivedType: payload?.type ?? null };
}
`,
  },
  {
    id: "uptime-monitor",
    name: "Uptime monitor",
    icon: "📡",
    category: "notifications",
    description: "Ping a URL, alert on fail.",
    accentClass: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    code: `import fn from "@hostfunc/fn";

export async function main(event: { time: string }) {
  const target = "https://example.com/health";
  const response = await fetch(target, { method: "GET" });
  const ok = response.ok;

  fn.log(ok ? "info" : "error", "uptime.check", { target, ok, at: event.time });
  return { target, ok, status: response.status };
}
`,
  },
  {
    id: "ai-text-summarizer",
    name: "AI text summarizer",
    icon: "🤖",
    category: "ai",
    description: "Summarize via Claude.",
    accentClass: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30",
    code: `import fn from "@hostfunc/fn";

export async function main(input: { text: string }) {
  if (!input.text?.trim()) {
    return { summary: "" };
  }

  const summary = await fn.executeFunction("you/claude-summarize", {
    text: input.text,
    maxSentences: 3,
  });

  return { summary };
}
`,
  },
  {
    id: "ai-sentiment-analyzer",
    name: "AI sentiment analyzer",
    icon: "🧠",
    category: "ai",
    description: "Classify sentiment with confidence.",
    accentClass: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    code: `import fn from "@hostfunc/fn";

export async function main(input: { text: string }) {
  const text = input.text?.trim() ?? "";
  if (!text) {
    return { label: "neutral", confidence: 0 };
  }

  const result = await fn.executeFunction("you/claude-sentiment", {
    text,
    labels: ["positive", "neutral", "negative"],
  });

  return result;
}
`,
  },
  {
    id: "hacker-news-digest",
    name: "Hacker News digest",
    icon: "📰",
    category: "data",
    description: "Top 10 stories, daily.",
    accentClass: "bg-orange-500/10 text-orange-300 border-orange-500/30",
    code: `export async function main() {
  const ids = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json")
    .then((res) => res.json() as Promise<number[]>);

  const topTen = await Promise.all(
    ids.slice(0, 10).map((id) =>
      fetch(\`https://hacker-news.firebaseio.com/v0/item/\${id}.json\`).then((res) => res.json()),
    ),
  );

  return { generatedAt: new Date().toISOString(), stories: topTen };
}
`,
  },
  {
    id: "github-profile-lookup",
    name: "GitHub profile lookup",
    icon: "🐙",
    category: "integrations",
    description: "Profile + repos for any user.",
    accentClass: "bg-slate-500/10 text-slate-300 border-slate-500/30",
    code: `import { secret } from "@hostfunc/fn";

export async function main(input: { username: string }) {
  const token = await secret.getRequired("GITHUB_TOKEN");
  const headers = { Authorization: \`Bearer \${token}\`, "User-Agent": "hostfunc" };

  const profile = await fetch(\`https://api.github.com/users/\${input.username}\`, { headers }).then((r) => r.json());
  const repos = await fetch(\`https://api.github.com/users/\${input.username}/repos?per_page=5\`, { headers }).then((r) => r.json());

  return { profile, repos };
}
`,
  },
  {
    id: "slack-channel-notify",
    name: "Slack channel notify",
    icon: "💬",
    category: "integrations",
    description: "Send formatted alerts to Slack.",
    accentClass: "bg-teal-500/10 text-teal-300 border-teal-500/30",
    code: `import { secret } from "@hostfunc/fn";

export async function main(input: { channel: string; text: string }) {
  const webhookUrl = await secret.getRequired("SLACK_WEBHOOK_URL");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      channel: input.channel,
      text: input.text,
      username: "hostfunc-bot",
    }),
  });

  return { ok: response.ok, status: response.status };
}
`,
  },
  {
    id: "url-metadata-extractor",
    name: "URL metadata extractor",
    icon: "🔗",
    category: "utilities",
    description: "Title, OG tags, og:image.",
    accentClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    code: `export async function main(input: { url: string }) {
  const html = await fetch(input.url).then((res) => res.text());
  const title = html.match(/<title>(.*?)<\\/title>/i)?.[1] ?? "";
  const ogImage = html.match(/property="og:image" content="([^"]+)"/i)?.[1] ?? "";
  const description = html.match(/name="description" content="([^"]+)"/i)?.[1] ?? "";

  return { url: input.url, title, description, ogImage };
}
`,
  },
  {
    id: "json-transformer",
    name: "JSON transformer",
    icon: "🔧",
    category: "utilities",
    description: "Reshape via composition.",
    accentClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    code: `export async function main(input: Record<string, unknown>) {
  const normalized = {
    ...input,
    createdAt: new Date().toISOString(),
    keys: Object.keys(input).sort(),
  };

  return {
    result: normalized,
    preview: JSON.stringify(normalized).slice(0, 140),
  };
}
`,
  },
];

export const TEMPLATE_IDS = FUNCTION_TEMPLATES.map((template) => template.id);

export const TEMPLATES: Record<string, string> = Object.fromEntries(
  FUNCTION_TEMPLATES.map((template) => [template.id, template.code]),
);
