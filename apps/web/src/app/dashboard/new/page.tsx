"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FUNCTION_TEMPLATES, TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code,
  Globe,
  Monitor,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
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
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState<"all" | (typeof FUNCTION_TEMPLATES)[number]["category"]>(
    "all",
  );

  const templateRecord = useMemo(
    () => FUNCTION_TEMPLATES.find((template) => template.id === selectedTemplate),
    [selectedTemplate],
  );
  const suggestedSlug = useMemo(() => {
    const base = templateRecord?.name ?? "hello-world";
    return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }, [templateRecord]);
  const slugLooksValid = slug.length === 0 || /^[a-z0-9-]+$/.test(slug);
  const slugLengthValid = slug.length === 0 || (slug.length >= 3 && slug.length <= 64);
  const step1Complete = slug.trim().length > 0 && slugLooksValid && slugLengthValid;
  const step2Complete = step1Complete && selectedTemplate.length > 0;
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const canSubmit = step2Complete;
  const showPreview = currentStep >= 2 && step1Complete;

  const templateCategories = useMemo(
    () => ["all", ...new Set(FUNCTION_TEMPLATES.map((template) => template.category))] as const,
    [],
  );
  const filteredTemplateOptions = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    return templateOptions.filter((template) => {
      const category = FUNCTION_TEMPLATES.find((t) => t.id === template.id)?.category;
      const matchesCategory = templateCategory === "all" || category === templateCategory;
      const matchesQuery =
        query.length === 0 ||
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [templateOptions, templateCategory, templateSearch]);

  const pendingLabel = useMemo(() => {
    if (!isPending) return "Deploy Function";
    if (slug.trim().length === 0) return "Creating function...";
    if (description.trim().length > 0) return "Applying template...";
    return "Opening editor...";
  }, [isPending, slug, description]);

  useEffect(() => {
    if (!step1Complete && currentStep !== 1) {
      setCurrentStep(1);
      return;
    }
    if (!step2Complete && currentStep === 3) {
      setCurrentStep(2);
    }
  }, [step1Complete, step2Complete, currentStep]);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
      {/* Left Column: Form Configuration */}
      <div className="flex flex-1 flex-col pt-4 lg:max-w-xl">
        <div>
          <h1 className="mb-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">Create new function</h1>
          <p className="mb-4 text-[var(--color-bone-muted)]">
            Deploy scalable serverless logic in a guided three-step flow.
          </p>
          <div className="mb-8 grid grid-cols-3 gap-2 text-xs">
            {[
              { id: "step1", title: "Identity" },
              { id: "step2", title: "Template" },
              { id: "step3", title: "Review" },
            ].map((step, idx) => (
              <div
                key={step.id}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-center",
                  idx + 1 === currentStep
                    ? "border-[var(--color-amber)]/50 bg-[var(--color-amber)]/10 text-[var(--color-amber)]"
                    : (idx === 0 && step1Complete) || (idx === 1 && step2Complete) || (idx === 2 && step2Complete)
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-faint)]",
                )}
              >
                {idx + 1}. {step.title}
              </div>
            ))}
          </div>
        </div>

        <form action={formAction} className="flex flex-1 flex-col space-y-8">
          <input type="hidden" name="templateId" value={selectedTemplate} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="description" value={description} />

          <div className="space-y-6">
            <AnimatePresence mode="wait" initial={false}>
              {currentStep === 1 ? (
                <motion.div
                  key="step-1-panel"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/35 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-bone-faint)]">
                    Step 1 - Function identity
                  </p>
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
                        placeholder="my-awesome-api"
                        value={slug}
                        onChange={(event) => setSlug(event.target.value)}
                        className="h-12 border-[var(--color-border)] bg-[var(--color-ink-elevated)]/50 pl-[115px] text-[var(--color-bone)] backdrop-blur-sm transition-all focus:bg-[var(--color-ink-elevated)] focus-visible:ring-[var(--color-amber)]"
                        required
                      />
                      {state?.error?.slug && (
                        <p className="text-destructive text-xs absolute -bottom-5 left-0">
                          {state.error.slug[0]}
                        </p>
                      )}
                    </div>
                    {!slugLooksValid ? (
                      <p className="text-xs text-red-300">
                        Use only lowercase letters, numbers, and hyphens.
                      </p>
                    ) : null}
                    {!slugLengthValid ? (
                      <p className="text-xs text-red-300">Slug must be between 3 and 64 characters.</p>
                    ) : null}
                    {slug.length === 0 ? (
                      <p className="text-xs text-[var(--color-bone-faint)]">
                        Suggested:{" "}
                        <button
                          type="button"
                          className="font-mono text-[var(--color-amber)] hover:underline"
                          onClick={() => setSlug(suggestedSlug)}
                        >
                          {suggestedSlug}
                        </button>
                      </p>
                    ) : null}
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
                      placeholder="What does it do?"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="h-12 border-[var(--color-border)] bg-[var(--color-ink-elevated)]/50 text-[var(--color-bone)] backdrop-blur-sm transition-all focus:bg-[var(--color-ink-elevated)] focus-visible:ring-[var(--color-amber)]"
                    />
                    <p className="text-xs text-[var(--color-bone-faint)]">
                      Keep this short and specific. It appears in function listings.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      disabled={!step1Complete}
                      className="rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                    >
                      Continue to template
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              {currentStep === 2 ? (
                <motion.div
                  key="step-2-panel"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/35 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-bone-faint)]">
                    Step 2 - Starter template
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={templateSearch}
                      onChange={(event) => setTemplateSearch(event.target.value)}
                      placeholder="Search templates..."
                      className="h-10 max-w-[220px] border-[var(--color-border)] bg-[var(--color-ink-elevated)]/50 text-[var(--color-bone)]"
                    />
                    <select
                      value={templateCategory}
                      onChange={(event) => setTemplateCategory(event.target.value as typeof templateCategory)}
                      className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/50 px-3 text-sm text-[var(--color-bone)]"
                    >
                      {templateCategories.map((category) => (
                        <option key={category} value={category}>
                          {category === "all" ? "All categories" : category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid max-h-[360px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {filteredTemplateOptions.map((tmpl) => {
                      const isActive = selectedTemplate === tmpl.id;
                      const Icon = tmpl.icon;
                      const category = FUNCTION_TEMPLATES.find((template) => template.id === tmpl.id)?.category;

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
                              {isActive ? <CheckCircle2 className="h-4 w-4 text-[var(--color-amber)]" /> : null}
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-[var(--color-bone)]">{tmpl.title}</h3>
                              <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--color-bone-faint)]">
                                {category ?? "template"}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs text-[var(--color-bone-muted)]">
                                {tmpl.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {filteredTemplateOptions.length === 0 ? (
                      <div className="col-span-full rounded-lg border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-bone-faint)]">
                        No templates found. Try clearing filters.
                      </div>
                    ) : null}
                  </div>
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                      className="rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      disabled={!step2Complete}
                      className="rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                    >
                      Continue to review
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <AnimatePresence initial={false}>
            {currentStep === 3 ? (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="sticky bottom-0 z-10 space-y-3 border-t border-[var(--color-border)] bg-[var(--color-ink)]/95 pb-4 pt-5 backdrop-blur"
              >
                <div className="rounded-xl border border-[var(--color-border)] bg-white/[0.02] px-4 py-3 text-xs text-[var(--color-bone-faint)]">
                  <p className="font-medium text-[var(--color-bone)]">Step 3 - Review</p>
                  <p className="mt-1">
                    Creating <span className="font-mono text-[var(--color-bone)]">{slug || "(slug required)"}</span>{" "}
                    with <span className="text-[var(--color-bone)]">{templateRecord?.name ?? "Hello world"}</span>{" "}
                    starter.
                  </p>
                </div>
                {state?.error?.form ? (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {state.error.form[0]}
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="rounded-full border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone-muted)] hover:bg-white/[0.06] hover:text-[var(--color-bone)]"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="group relative h-12 w-full overflow-hidden rounded-full bg-[var(--color-amber)] text-[var(--color-ink)] shadow-lg hover:bg-[var(--color-amber-hover)]"
                  disabled={isPending || !canSubmit}
                >
                  <span className="relative z-10 flex items-center justify-center font-medium">
                    {isPending ? (
                      <>
                        <Activity className="w-5 h-5 mr-2 animate-spin" />
                        {pendingLabel}
                      </>
                    ) : (
                      <>
                        Deploy Function
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/10 to-primary-foreground/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </form>
      </div>

      {/* Right Column: Code Preview */}
      <div className="hidden min-h-[360px] flex-1 lg:flex lg:max-w-2xl lg:self-stretch">
        <AnimatePresence mode="wait" initial={false}>
          {showPreview ? (
            <motion.div
              key="preview-live"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24 }}
              className="group relative h-full w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[#0d1117] text-gray-300 shadow-2xl"
            >
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
                <div className="ml-4 text-xs text-gray-500">
                  {templateRecord?.name ?? "Starter"} · {templateRecord?.category ?? "utilities"}
                </div>
              </div>

              <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-50 transition-opacity group-hover:opacity-100" />

              <div className="flex w-full overflow-auto p-5 pt-14">
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
            </motion.div>
          ) : (
            <motion.div
              key="preview-locked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/35 p-8 text-center"
            >
              <Code className="mb-3 h-7 w-7 text-[var(--color-amber)]" />
              <p className="text-sm font-medium text-[var(--color-bone)]">Live template preview locked</p>
              <p className="mt-2 max-w-sm text-xs text-[var(--color-bone-faint)]">
                  Complete Step 1 with a valid slug, then continue to Step 2 to unlock the preview window.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
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
