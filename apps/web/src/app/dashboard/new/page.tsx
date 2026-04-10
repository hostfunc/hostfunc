"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFunctionAction } from "./actions";
import { TEMPLATES } from "@/lib/templates";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Zap, Clock, Code, Activity, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [state, formAction, isPending] = useActionState<any, FormData>(
    createFunctionAction, 
    null
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:h-[calc(100vh-8rem)]">
      
      {/* Left Column: Form Configuration */}
      <div className="flex-1 lg:max-w-xl flex flex-col pt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Create new function</h1>
          <p className="text-muted-foreground mb-8">Deploy scalable serverless logic in seconds.</p>
        </div>

        <form action={formAction} className="space-y-8 flex-1 flex flex-col justify-between">
          <input type="hidden" name="templateId" value={selectedTemplate} />
          
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Function Slug</Label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground sm:text-sm border-r pr-2 py-1 border-muted">hostfunc.com/</span>
                  </div>
                  <Input 
                    id="slug" 
                    name="slug" 
                    placeholder="my-awesome-api" 
                    className="pl-[115px] h-12 bg-background/50 border-muted focus-visible:ring-primary backdrop-blur-sm transition-all focus:bg-background"
                    required 
                  />
                  {state?.error?.slug && (
                    <p className="text-destructive text-xs absolute -bottom-5 left-0">{state.error.slug[0]}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Input 
                  id="description" 
                  name="description" 
                  placeholder="What does it do?" 
                  className="h-12 bg-background/50 border-muted focus-visible:ring-primary backdrop-blur-sm transition-all focus:bg-background"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Starter Template</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                {TEMPLATE_OPTIONS.map((tmpl) => {
                  const isActive = selectedTemplate === tmpl.id;
                  const Icon = tmpl.icon;
                  
                  return (
                    <div 
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={cn(
                        "relative cursor-pointer rounded-xl border p-4 transition-all duration-300",
                        isActive 
                          ? "bg-card border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.05)] ring-1 ring-primary/20" 
                          : "bg-muted/10 border-border hover:border-foreground/20 hover:bg-muted/50"
                      )}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="activeTemplate"
                          className="absolute inset-0 rounded-xl bg-primary/[0.03] pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      )}
                      <div className="relative z-10 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className={cn("inline-flex items-center justify-center p-2 rounded-lg border", tmpl.color)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {isActive && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-sm text-foreground">{tmpl.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{tmpl.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="pt-8 pb-4">
            <Button type="submit" size="lg" className="w-full h-12 shadow-lg group relative overflow-hidden" disabled={isPending}>
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
      <div className="flex-1 hidden lg:flex rounded-2xl border bg-[#0d1117] text-gray-300 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 inset-x-0 h-10 border-b border-gray-800 bg-[#161b22] px-4 flex items-center gap-2">
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
            {(TEMPLATES[selectedTemplate] || "").split('\\n').map((_: string, i: number) => (
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
                {(TEMPLATES[selectedTemplate] || "").split('\\n').map((line: string, i: number) => {
                  if (line.trim().startsWith('//')) {
                    return (
                      <div key={i} dangerouslySetInnerHTML={{ __html: '<span class="text-[#8b949e]">' + line + '</span>' }} className="h-5" />
                    );
                  }

                  // A very basic glowing syntax highlight simulation
                  let content = line;
                  
                  // Extract strings to prevent inner replacements
                  content = content.replace(/"(.*?)"/g, '§DBL§$1§DBL§');
                  content = content.replace(/'(.*?)'/g, '§SGL§$1§SGL§');
                  content = content.replace(/`(.*?)`/g, '§TICK§$1§TICK§');

                  // Keywords
                  content = content.replace(/\b(import|from|export|async|function|return|if|const)\b/g, '<span class="text-[#ff7b72]">$1</span>');
                  
                  // Functions
                  content = content.replace(/\b(main|json|log)\( /g, '<span class="text-[#d2a8ff]">$1</span>('); // removed the space on purpose
                  content = content.replace(/\b(main|json|log)\(/g, '<span class="text-[#d2a8ff]">$1</span>(');
                  
                  // Restore strings
                  content = content.replace(/§DBL§(.*?)§DBL§/g, '<span class="text-[#a5d6ff]">"$1"</span>');
                  content = content.replace(/§SGL§(.*?)§SGL§/g, '<span class="text-[#a5d6ff]">\'$1\'</span>');
                  content = content.replace(/§TICK§(.*?)§TICK§/g, '<span class="text-[#a5d6ff]">`$1`</span>');

                  return (
                    <div key={i} dangerouslySetInnerHTML={{ __html: content || ' ' }} className="h-5" />
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