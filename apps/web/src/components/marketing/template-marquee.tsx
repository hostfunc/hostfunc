"use client";

import { Button } from "@/components/ui/button";
import type { MarketingContent } from "@/lib/marketing-content";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  templates: MarketingContent["templates"];
}

export function TemplateMarquee({ templates }: Props) {
  const highlighted = templates.slice(0, 4);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
      {highlighted.map((template) => (
        <article
          key={template.templateId}
          className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 p-7 transition-all hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-3xl">{template.icon}</span>
            <span className="rounded-full border border-[var(--color-border)] bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-widest text-[var(--color-bone-faint)]">
              {toTitleCase(template.category)}
            </span>
          </div>
          <h3 className="mt-5 font-display text-3xl text-[var(--color-bone)]">{template.name}</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-bone-muted)]">
            {template.description}
          </p>
          <TemplateSnippet code={template.snippet} />
          <div className="mt-5 flex justify-end">
            <Button
              asChild
              size="sm"
              className="rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              <Link href={buildTemplateHref(template.templateId)}>
                Use template
                <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function buildTemplateHref(templateId: string): string {
  return `/dashboard/new?template=${encodeURIComponent(templateId)}`;
}

function toTitleCase(value: string): string {
  return value
    .split("-")
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}

function TemplateSnippet({ code }: { code: string }) {
  const language = inferLanguage(code);
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-border)] bg-black/35">
      <div className="border-b border-[var(--color-border)] px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-[var(--color-bone-faint)]">
        {language}
      </div>
      <pre className="min-h-56 whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed">
        <code>
          {code.split("\n").map((line, lineIdx, lines) => (
            <span key={`${lineIdx}-${line}`} className="block">
              {tokenizeLine(line, language).map((token, tokenIdx) => (
                <span key={`${lineIdx}-${tokenIdx}-${token.value}`} style={getTokenStyle(token.className)}>
                  {token.value}
                </span>
              ))}
              {lineIdx < lines.length - 1 ? "\n" : ""}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function inferLanguage(code: string): "typescript" | "json" | "bash" {
  const trimmed = code.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.startsWith("#") || trimmed.startsWith("curl ")) return "bash";
  return "typescript";
}

function tokenizeLine(
  line: string,
  language: "typescript" | "json" | "bash",
): Array<{ value: string; className?: string }> {
  const patterns: Record<typeof language, RegExp> = {
    typescript:
      /(\/\/.*$|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`|\b(?:import|export|default|async|await|function|return|const|let|var|if|else|try|catch|throw|new|class|interface|type|extends|implements|from|as|true|false|null|undefined)\b|\b(?:number|string|boolean|unknown|void|Record|Promise|Date)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][A-Za-z0-9_$]*\s*(?=\())/g,
    bash: /(#.*$|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|--?[A-Za-z0-9-]+|\b(?:npm|pnpm|npx|hostfunc|curl|node|export|cat|echo|cd|ls|pwd|git|docker)\b|\|\||&&|[|><])/g,
    json:
      /("(?:\\.|[^"])*"\s*:|"(?:\\.|[^"])*"|\b(?:true|false|null)\b|\b-?\d+(?:\.\d+)?\b|[{}\[\],:])/g,
  };
  const regex = patterns[language];
  const result: Array<{ value: string; className?: string }> = [];
  let lastIndex = 0;

  for (const match of line.matchAll(regex)) {
    const matched = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) result.push({ value: line.slice(lastIndex, start) });
    result.push({ value: matched, className: getTokenClass(language, matched) });
    lastIndex = start + matched.length;
  }

  if (lastIndex < line.length) result.push({ value: line.slice(lastIndex) });
  if (result.length === 0) result.push({ value: line });
  return result;
}

function getTokenClass(language: "typescript" | "bash" | "json", token: string): string {
  if (language === "typescript") {
    if (token.startsWith("//")) return "token comment";
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) return "token string";
    if (/^[A-Za-z_$][A-Za-z0-9_$]*\s*(?=\()/.test(token)) return "token function";
    if (/^(number|string|boolean|unknown|void|Record|Promise|Date)$/.test(token)) return "token type";
    if (/^\d/.test(token)) return "token number";
    if (/^(true|false|null|undefined)$/.test(token)) return "token keyword";
    if (/^[@${}.:[\],()]+$/.test(token)) return "token punctuation";
    return "token keyword";
  }
  if (language === "bash") {
    if (token.startsWith("#")) return "token comment";
    if (token.startsWith('"') || token.startsWith("'")) return "token string";
    if (token.startsWith("$")) return "token variable";
    if (/^\|\||&&|[|><]$/.test(token)) return "token operator";
    if (token.startsWith("-")) return "token attr-name";
    return "token function";
  }
  if (token.endsWith(":")) return "token property";
  if (token.startsWith('"')) return "token string";
  if (/^(true|false|null)$/.test(token)) return "token keyword";
  if (/^-?\d/.test(token)) return "token number";
  return "token punctuation";
}

function getTokenStyle(className?: string): { color?: string } | undefined {
  if (!className) return undefined;
  if (className.includes("comment")) return { color: "var(--color-syntax-comment)" };
  if (className.includes("keyword")) return { color: "var(--color-syntax-keyword)" };
  if (className.includes("string")) return { color: "var(--color-syntax-string)" };
  if (className.includes("number")) return { color: "var(--color-syntax-number)" };
  if (className.includes("function")) return { color: "var(--color-syntax-function)" };
  if (className.includes("type")) return { color: "var(--color-syntax-type)" };
  if (className.includes("property")) return { color: "var(--color-syntax-property)" };
  if (className.includes("variable")) return { color: "var(--color-amber-hover)" };
  if (className.includes("attr-name")) return { color: "var(--color-cyan)" };
  if (className.includes("operator") || className.includes("punctuation")) {
    return { color: "var(--color-bone-faint)" };
  }
  return undefined;
}