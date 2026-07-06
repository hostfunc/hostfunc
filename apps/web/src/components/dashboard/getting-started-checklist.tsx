"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OnboardingState } from "@/server/onboarding";
import { ArrowRight, CheckCircle2, Circle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "hostfunc-onboarding-dismissed";

interface ChecklistStep {
  title: string;
  description: string;
  href: string;
  done: boolean;
  external?: boolean;
}

function buildSteps(state: OnboardingState): ChecklistStep[] {
  return [
    {
      title: "Deploy your first function",
      description: "Write a single main() and ship it to the edge in seconds.",
      href: "/dashboard/new",
      done: state.hasDeployedFn,
    },
    {
      title: "Run it",
      description: "Open your function in the editor and hit the Run button.",
      href: state.hasFunction ? "/dashboard/functions" : "/dashboard/new",
      done: state.hasExecution,
    },
    {
      title: "See the execution logs",
      description: "Open a function's Executions tab to inspect runs and logs.",
      href: "/dashboard/functions",
      done: state.hasExecution,
    },
    {
      title: "Add a secret",
      description: "Store an API key under Settings → Secrets; it's injected at runtime.",
      href: "/dashboard/functions",
      done: state.hasSecret,
    },
    {
      title: "Add a schedule or custom domain",
      description: "Run on a cron, react to email, or serve from your own domain.",
      href: "https://docs.hostfunc.io/triggers",
      done: state.hasTrigger,
      external: true,
    },
  ];
}

export function GettingStartedChecklist({ state }: { state: OnboardingState }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(DISMISS_KEY) !== "1");
  }, []);

  if (state.complete || !visible) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const steps = buildSteps(state);
  const progressPct = Math.round((state.completedCount / state.totalCount) * 100);

  return (
    <Card
      id="getting-started"
      className="border-[var(--color-border)] bg-[var(--color-ink-elevated)]/75 text-[var(--color-bone)]"
    >
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-xl tracking-tight">
          Get started with hostfunc
        </CardTitle>
        <CardDescription className="text-[var(--color-bone-muted)]">
          {state.completedCount} of {state.totalCount} steps done — finish these to get the most out
          of your workspace.
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss getting started checklist"
            className="text-[var(--color-bone-faint)] hover:text-[var(--color-bone)]"
            onClick={dismiss}
          >
            <X />
          </Button>
        </CardAction>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[var(--color-amber)] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-[var(--color-border)]">
          {steps.map((step) => (
            <li key={step.title}>
              <Link
                href={step.href}
                target={step.external ? "_blank" : undefined}
                rel={step.external ? "noreferrer" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-white/[0.04]",
                  step.done && "opacity-70",
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="size-5 shrink-0 text-[var(--color-bone-faint)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "font-medium text-sm",
                      step.done ? "text-[var(--color-bone-muted)]" : "text-[var(--color-bone)]",
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="truncate text-xs text-[var(--color-bone-faint)]">
                    {step.description}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-[var(--color-bone-faint)] transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
