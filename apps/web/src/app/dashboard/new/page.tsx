"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowRight, CheckCircle2, Clock, Code, Terminal, Zap } from "lucide-react";
import { useActionState, useState } from "react";
import { createFunctionAction } from "./actions";

// Make Monaco optional or load via standard lazy loading to prevent quick layout disruption
// For an aesthetically pleasing dashboard, a styled code block with Syntax Highlighting looks premium immediately,
// but since Monaco is provided, we can use it, or fallback to a custom block. We'll use a custom block to make it look
// glowing and beautiful without monaco loading flashes.

const TEMPLATE_OPTIONS = [
  {
    id: "hello-world",
    title: "Hello World",
    description: "A basic API endpoint resolving a simple JSON response.",
    icon: Terminal,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  {
    id: "webhook",
    title: "Webhook Handler",
    description: "Receive and validate HTTP callbacks from Stripe or GitHub.",
    icon: Zap,
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  {
    id: "cron",
    title: "Scheduled Cron",
    description: "Run periodic tasks based on interval timers.",
    icon: Clock,
    color: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  },
];

export default function NewFunctionPage() {
  const [selectedTemplate, setSelectedTemplate] = useState("hello-world");

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
                {TEMPLATE_OPTIONS.map((tmpl) => {
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
          <div className="text-gray-600 text-xs font-mono text-right select-none pr-4 space-y-1">
            {(TEMPLATES[selectedTemplate] || "").split("\\n").map((_: string, i: number) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: line numbers are order-dependent
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.pre
              key={selectedTemplate}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="text-sm font-mono leading-relaxed"
            >
              <code>
                {(TEMPLATES[selectedTemplate] || "").split("\\n").map((line: string, i: number) => {
                  // biome-ignore lint/suspicious/noArrayIndexKey: line numbers are order-dependent
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional syntax highlighter
                  if (line.trim().startsWith("//")) {
                    return (
                      <div
                        key={i}
                        dangerouslySetInnerHTML={{
                          __html: `<span class="text-[#8b949e]">${line}</span>`,
                        }}
                        className="h-5"
                      />
                    );
                  }

                  // A very basic glowing syntax highlight simulation
                  let content = line;

                  // Extract strings to prevent inner replacements
                  content = content.replace(/"(.*?)"/g, "§DBL§$1§DBL§");
                  content = content.replace(/'(.*?)'/g, "§SGL§$1§SGL§");
                  content = content.replace(/`(.*?)`/g, "§TICK§$1§TICK§");

                  // Keywords
                  content = content.replace(
                    /\b(import|from|export|async|function|return|if|const)\b/g,
                    '<span class="text-[#ff7b72]">$1</span>',
                  );

                  // Functions
                  content = content.replace(
                    /\b(main|json|log)\( /g,
                    '<span class="text-[#d2a8ff]">$1</span>(',
                  ); // removed the space on purpose
                  content = content.replace(
                    /\b(main|json|log)\(/g,
                    '<span class="text-[#d2a8ff]">$1</span>(',
                  );

                  // Restore strings
                  content = content.replace(
                    /§DBL§(.*?)§DBL§/g,
                    '<span class="text-[#a5d6ff]">"$1"</span>',
                  );
                  content = content.replace(
                    /§SGL§(.*?)§SGL§/g,
                    "<span class=\"text-[#a5d6ff]\">'$1'</span>",
                  );
                  content = content.replace(
                    /§TICK§(.*?)§TICK§/g,
                    '<span class="text-[#a5d6ff]">`$1`</span>',
                  );

                  // biome-ignore lint/suspicious/noArrayIndexKey: line numbers are order-dependent
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional syntax highlighter
                  return (
                    <div
                      key={i}
                      dangerouslySetInnerHTML={{ __html: content || " " }}
                      className="h-5"
                    />
                  );
                })}
              </code>
            </motion.pre>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
