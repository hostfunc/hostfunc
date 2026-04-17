"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, FolderPlus, Globe, Hexagon, Loader2, Sparkles } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { createWorkspaceAction } from "./actions";

// Dummy avatars/gradients to select from
const BRAND_PRESETS = [
  { id: "brand-1", css: "bg-gradient-to-br from-blue-500 to-indigo-600" },
  { id: "brand-2", css: "bg-gradient-to-br from-emerald-400 to-emerald-700" },
  { id: "brand-3", css: "bg-gradient-to-br from-rose-500 to-orange-500" },
  { id: "brand-4", css: "bg-gradient-to-br from-violet-600 to-fuchsia-600" },
];

export default function NewWorkspacePage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [customSlug, setCustomSlug] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(BRAND_PRESETS[0]?.id ?? "brand-1");

  // biome-ignore lint/suspicious/noExplicitAny: Standard form state action
  const [state, formAction, isPending] = useActionState<any, FormData>(createWorkspaceAction, null);

  // Auto-generate slug when name changes (if user hasn't explicitly customized the slug)
  useEffect(() => {
    if (!customSlug && name) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setSlug(generated);
    } else if (!customSlug && !name) {
      setSlug("");
    }
  }, [name, customSlug]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomSlug(true);
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const nextStep = () => {
    if (name.length >= 2) setStep(2);
  };

  return (
    <div className="mx-auto w-full max-w-lg py-6">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 rounded-2xl border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/12 p-3">
          <FolderPlus className="h-6 w-6 text-[var(--color-amber)]" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-bone)]">Create Workspace</h1>
        <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
          Deploy serverless infrastructure in seconds.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/80 shadow-2xl">
        {/* Progress Bar */}
        <div className="h-1 w-full bg-white/[0.05]">
          <motion.div
            className="h-full bg-[var(--color-amber)]"
            initial={{ width: "50%" }}
            animate={{ width: step === 1 ? "50%" : "100%" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>

        <div className="p-8">
          <form action={formAction}>
            {/* HIDDEN INPUTS to preserve state across UI steps */}
            <input type="hidden" name="name" value={name} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="logo" value={selectedBrand} />

            <AnimatePresence mode="wait">
              {/* STEP 1: Naming */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="orgName"
                      className="text-xs font-semibold uppercase tracking-widest text-[var(--color-bone-faint)]"
                    >
                      Workspace Name
                    </Label>
                    <Input
                      id="orgName"
                      placeholder="Acme Corp"
                      className="h-14 rounded-xl border-[var(--color-border)] bg-[var(--color-ink)]/70 text-lg text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:ring-[var(--color-amber)]"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && name.length >= 2) {
                          e.preventDefault();
                          nextStep();
                        }
                      }}
                    />
                    {state?.error?.name && (
                      <p className="text-xs text-red-300 mt-1">{state.error.name[0]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="orgSlug"
                      className="text-xs font-semibold uppercase tracking-widest text-[var(--color-bone-faint)]"
                    >
                      Workspace URL
                    </Label>
                    <div className="relative flex items-center">
                      <Globe className="absolute left-4 h-4 w-4 text-[var(--color-bone-faint)]" />
                      <Input
                        id="orgSlug"
                        placeholder="acme-corp"
                        className="h-12 rounded-xl border-[var(--color-border)] bg-[var(--color-ink)]/70 pl-11 text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:ring-[var(--color-amber)]"
                        value={slug}
                        onChange={handleSlugChange}
                      />
                    </div>
                    <p className="h-4 px-1 text-[11px] text-[var(--color-bone-faint)]">
                      {slug ? `hostfunc.io/${slug}` : "hostfunc.io/your-url"}
                    </p>
                    {state?.error?.slug && (
                      <p className="text-xs text-red-300 mt-1">{state.error.slug[0]}</p>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={name.length < 2}
                    className="relative mt-4 h-12 w-full overflow-hidden rounded-xl text-base font-semibold bg-[var(--color-amber)] text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                  >
                    <span className="relative z-10 flex items-center">
                      Continue{" "}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </motion.div>
              )}

              {/* STEP 2: Branding & Submit */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-3">
                    <div className="mb-4 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--color-amber)]" />
                      <Label className="text-xs font-semibold uppercase tracking-widest text-[var(--color-bone-faint)]">
                        Select Avatar
                      </Label>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {BRAND_PRESETS.map((brand) => (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => setSelectedBrand(brand.id)}
                          className={cn(
                            "relative aspect-square cursor-pointer rounded-2xl border-0 p-0 transition-all duration-300",
                            brand.css,
                            selectedBrand === brand.id
                              ? "ring-2 ring-[var(--color-bone)] ring-offset-4 ring-offset-[var(--color-ink-elevated)] scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                              : "opacity-60 hover:scale-105 hover:opacity-100",
                          )}
                        >
                          <Hexagon className="absolute inset-0 m-auto h-6 w-6 text-white/50" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink)]/70 p-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                        BRAND_PRESETS.find((b) => b.id === selectedBrand)?.css,
                      )}
                    >
                      <span className="text-lg font-bold text-white">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="truncate font-semibold text-[var(--color-bone)]">{name}</p>
                      <p className="truncate text-xs text-[var(--color-bone-faint)]">hostfunc.io/{slug}</p>
                    </div>
                  </div>

                  <div className="flex w-full gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep(1)}
                      className="h-12 w-12 shrink-0 rounded-xl border border-[var(--color-border)] bg-transparent hover:bg-white/[0.05]"
                      disabled={isPending}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="group relative h-12 min-w-0 flex-1 overflow-hidden rounded-xl bg-[var(--color-amber)] text-base font-semibold text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                    >
                      <span className="relative z-10 flex items-center justify-center whitespace-nowrap px-2 text-center">
                        {isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" /> Creating Workspace...
                          </>
                        ) : (
                          <>Create Workspace</>
                        )}
                      </span>
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>
    </div>
  );
}
