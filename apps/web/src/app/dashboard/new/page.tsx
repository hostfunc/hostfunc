"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FUNCTION_TEMPLATES, TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowRight, CheckCircle2, Code, Globe, Monitor, Sparkles, Terminal, Wrench } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createFunctionAction } from "./actions";

// Make Monaco optional or load via standard lazy loading to prevent quick layout disruption
// For an aesthetically pleasing dashboard, a styled code block with Syntax Highlighting looks premium immediately,
// but since Monaco is provided, we can use it, or fallback to a custom block. We'll use a custom block to make it look
// glowing and beautiful without monaco loading flashes.

export default function NewFunctionPage() {
  const searchParams = useSearchParams();
  const requestedTemplateId = searchParams.get("template");
  const availableIds = useMemo(
    () => new Set(FUNCTION_TEMPLATES.map((template) => template.id)),
    [],
  );
  const [selectedTemplate, setSelectedTemplate] = useState("hello-world");
  const templateOptions = useMemo(
    () =>
      FUNCTION_TEMPLATES.map((template) => ({
        id: template.id,
        title: template.name,
        description: template.description,
        icon: resolveTemplateIcon(template.category),
        color: template.accentClass,
      })),
    [],
  );

  useEffect(() => {
    if (!requestedTemplateId) return;
    if (!availableIds.has(requestedTemplateId)) return;
    setSelectedTemplate(requestedTemplateId);
  }, [requestedTemplateId, availableIds]);

  // React 19 standard hook for async Server Actions in client components
  // biome-ignore lint/suspicious/noExplicitAny: Standard form action
  const [state, formAction, isPending] = useActionState<any, FormData>(createFunctionAction, null);

  return (
    <div className="flex flex-col gap-8 lg:h-[calc(100vh-8rem)] lg:flex-row">
      {/* Left Column: Form Configuration */}
      <div className="flex flex-1 flex-col pt-4 lg:max-w-xl">
        <div>
          <h1 className="mb-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">Create new function</h1>
          <p className="mb-8 text-[var(--color-bone-muted)]">Deploy scalable serverless logic in seconds.</p>
        </div>

        <form action={formAction} className="flex flex-1 flex-col justify-between space-y-8">
          <input type="hidden" name="templateId" value={selectedTemplate} />

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <Label
                  htmlFor="slug"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Function Slug
                </Label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground sm:text-sm border-r pr-2 py-1 border-muted">
                      hostfunc.com/
                    </span>
                  </div>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="my-awesome-api"
                    className="h-12 border-[var(--color-border)] bg-[var(--color-ink-elevated)]/50 pl-[115px] text-[var(--color-bone)] backdrop-blur-sm transition-all focus:bg-[var(--color-ink-elevated)] focus-visible:ring-[var(--color-amber)]"
                    required
                  />
                  {state?.error?.slug && (
                    <p className="text-destructive text-xs absolute -bottom-5 left-0">
                      {state.error.slug[0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Description
                </Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="What does it do?"
                  className="h-12 border-[var(--color-border)] bg-[var(--color-ink-elevated)]/50 text-[var(--color-bone)] backdrop-blur-sm transition-all focus:bg-[var(--color-ink-elevated)] focus-visible:ring-[var(--color-amber)]"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Starter Template
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                {templateOptions.map((tmpl) => {
                  const isActive = selectedTemplate === tmpl.id;
                  const Icon = tmpl.icon;

                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={cn(
                        "relative cursor-pointer rounded-xl border p-4 transition-all duration-300 text-left w-full",
                        isActive
                          ? "border-[var(--color-amber)]/50 bg-[var(--color-ink-elevated)] shadow-[0_0_15px_rgba(255,197,107,0.1)] ring-1 ring-[var(--color-amber)]/20"
                          : "border-[var(--color-border)] bg-white/[0.02] hover:bg-white/[0.04] hover:border-[var(--color-bone-faint)]",
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTemplate"
                          className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--color-amber)]/[0.05]"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      )}
                      <div className="relative z-10 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div
                            className={cn(
                              "inline-flex items-center justify-center p-2 rounded-lg border",
                              tmpl.color,
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          {isActive && <CheckCircle2 className="h-4 w-4 text-[var(--color-amber)]" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-[var(--color-bone)]">{tmpl.title}</h3>
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-bone-muted)]">
                            {tmpl.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-8 pb-4">
            <Button
              type="submit"
              size="lg"
              className="group relative h-12 w-full overflow-hidden rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] shadow-lg hover:bg-[var(--color-amber-hover)]"
              disabled={isPending}
            >
              <span className="relative z-10 flex items-center justify-center font-medium">
                {isPending ? (
                  <Activity className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <>
                    Deploy Function
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/10 to-primary-foreground/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
            </Button>
          </div>
        </form>
      </div>

      {/* Right Column: Code Preview */}
      <div className="group relative hidden flex-1 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[#0d1117] text-gray-300 shadow-2xl lg:flex">
        <div className="absolute inset-x-0 top-0 flex h-10 items-center gap-2 border-b border-[var(--color-border)] bg-[#161b22] px-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="ml-4 flex items-center text-xs font-mono text-gray-500">
            <Code className="w-3.5 h-3.5 mr-2" />
            index.ts
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-100" />

        <div className="pt-14 p-6 overflow-auto w-full flex">
          {(() => {
            const previewCode = TEMPLATES[selectedTemplate] || "";
            const lines = previewCode.split("\n");
            const language = inferPreviewLanguage(previewCode);
            return (
              <>
                <div className="space-y-1 pr-4 text-right font-mono text-xs text-gray-600 select-none">
                  {lines.map((line, lineIdx) => (
                    <div key={`line-num-${lineIdx}-${line.length}`}>{lineIdx + 1}</div>
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  <motion.pre
                    key={selectedTemplate}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="min-w-0 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                  >
                    <code>
                      {lines.map((line, lineIdx) => (
                        <div
                          key={`line-code-${lineIdx}-${line}`}
                          className="min-h-5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                        >
                          {tokenizePreviewLine(line, language).map((token, tokenIdx) => (
                            <span
                              key={`token-${lineIdx}-${tokenIdx}-${token.value}`}
                              style={getPreviewTokenStyle(token.className)}
                            >
                              {token.value}
                            </span>
                          ))}
                          {line.length === 0 ? " " : null}
                        </div>
                      ))}
                    </code>
                  </motion.pre>
                </AnimatePresence>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function resolveTemplateIcon(category: string) {
  if (category === "ai") return Sparkles;
  if (category === "integrations") return Globe;
  if (category === "notifications") return Monitor;
  if (category === "data") return Terminal;
  return Wrench;
}

function inferPreviewLanguage(code: string): "typescript" | "json" | "bash" {
  const trimmed = code.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.startsWith("#") || trimmed.startsWith("curl ")) return "bash";
  return "typescript";
}

function tokenizePreviewLine(
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
    result.push({ value: matched, className: getPreviewTokenClass(language, matched) });
    lastIndex = start + matched.length;
  }

  if (lastIndex < line.length) result.push({ value: line.slice(lastIndex) });
  if (result.length === 0) result.push({ value: line });
  return result;
}

function getPreviewTokenClass(language: "typescript" | "bash" | "json", token: string): string {
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

function getPreviewTokenStyle(className?: string): { color?: string } | undefined {
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
