"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

function inferLanguage(code: string): "typescript" | "bash" | "json" {
  const trimmed = code.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json";
  }
  if (
    trimmed.startsWith("#") ||
    trimmed.includes("pnpm ") ||
    trimmed.includes("npm install") ||
    trimmed.includes("hostfunc ")
  ) {
    return "bash";
  }
  return "typescript";
}

export function DocsCodeBlock({
  code,
  language,
}: { code: string; language?: "typescript" | "bash" | "json" }) {
  const [copied, setCopied] = useState(false);
  const resolvedLanguage = language ?? inferLanguage(code);
  const lines = code.split("\n");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="docs-code relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-[11px] uppercase tracking-wider text-slate-400">
          {resolvedLanguage}
        </span>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          aria-label="Copy code example"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code>
          {lines.map((line, lineIdx) => {
            const lineOffset = lines
              .slice(0, lineIdx)
              .reduce((sum, value) => sum + value.length + 1, 0);
            return (
              <span key={`line-${lineOffset}-${line}`} className="block">
                {tokenizeLine(line, resolvedLanguage).map((token) => (
                  <span
                    key={`token-${lineOffset + token.start}-${token.value}`}
                    className={token.className}
                  >
                    {token.value}
                  </span>
                ))}
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

function tokenizeLine(
  line: string,
  language: "typescript" | "bash" | "json",
): Array<{ value: string; className?: string; start: number }> {
  const patterns: Record<string, RegExp> = {
    typescript:
      /(\/\/.*$|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`|\b(?:import|export|async|await|function|return|const|let|var|if|else|try|catch|throw|new|class|interface|type|extends|implements|from)\b|\b\d+(?:\.\d+)?\b)/g,
    bash: /(#.*$|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|--?[A-Za-z0-9-]+|\b(?:npm|pnpm|npx|hostfunc|curl|node|export)\b)/g,
    json: /("(?:\\.|[^"])*"\s*:|"(?:\\.|[^"])*"|\b(?:true|false|null)\b|\b-?\d+(?:\.\d+)?\b|[{}\[\],:])/g,
  };

  const regex = patterns[language];
  const result: Array<{ value: string; className?: string; start: number }> = [];
  let lastIndex = 0;

  for (const match of line.matchAll(regex ?? /./g)) {
    const matched = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) {
      result.push({ value: line.slice(lastIndex, start), start: lastIndex });
    }
    result.push({ value: matched, className: getTokenClass(language, matched), start });
    lastIndex = start + matched.length;
  }

  if (lastIndex < line.length) {
    result.push({ value: line.slice(lastIndex), start: lastIndex });
  }

  if (result.length === 0) {
    result.push({ value: line, start: 0 });
  }

  return result;
}

function getTokenClass(language: "typescript" | "bash" | "json", token: string): string {
  if (language === "typescript") {
    if (token.startsWith("//")) return "token comment";
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`"))
      return "token string";
    if (/^\d/.test(token)) return "token number";
    return "token keyword";
  }

  if (language === "bash") {
    if (token.startsWith("#")) return "token comment";
    if (token.startsWith('"') || token.startsWith("'")) return "token string";
    if (token.startsWith("$")) return "token variable";
    if (token.startsWith("-")) return "token attr-name";
    return "token function";
  }

  if (token.endsWith(":")) return "token property";
  if (token.startsWith('"')) return "token string";
  if (/^(true|false|null)$/.test(token)) return "token keyword";
  if (/^-?\d/.test(token)) return "token number";
  return "token punctuation";
}
