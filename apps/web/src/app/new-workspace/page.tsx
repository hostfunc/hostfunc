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
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden text-slate-200">
      {/* Background Visuals */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header Ribbon */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="bg-primary/20 p-3 rounded-2xl mb-4 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
            <FolderPlus className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Create Workspace</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Deploy serverless infrastructure in seconds.
          </p>
        </div>

        {/* Morphing Form Card */}
        <div className="bg-[#0f0f11]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
          {/* Progress Bar */}
          <div className="h-1 w-full bg-white/5">
            <motion.div
              className="h-full bg-primary"
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
                        className="text-xs uppercase tracking-widest text-muted-foreground font-semibold"
                      >
                        Workspace Name
                      </Label>
                      <Input
                        id="orgName"
                        placeholder="Acme Corp"
                        className="h-14 bg-black/40 border-white/10 text-lg focus-visible:ring-primary focus-visible:border-primary transition-all placeholder:text-muted-foreground/50 rounded-xl"
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
                        <p className="text-red-400 text-xs mt-1">{state.error.name[0]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="orgSlug"
                        className="text-xs uppercase tracking-widest text-muted-foreground font-semibold"
                      >
                        Workspace URL
                      </Label>
                      <div className="relative flex items-center">
                        <Globe className="absolute left-4 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="orgSlug"
                          placeholder="acme-corp"
                          className="h-12 pl-11 bg-black/40 border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl"
                          value={slug}
                          onChange={handleSlugChange}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground px-1 h-4">
                        {slug ? `hostfunc.com/${slug}` : "hostfunc.com/your-url"}
                      </p>
                      {state?.error?.slug && (
                        <p className="text-red-400 text-xs mt-1">{state.error.slug[0]}</p>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={name.length < 2}
                      className="w-full h-12 rounded-xl text-base font-semibold group mt-4 relative overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center">
                        Continue{" "}
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
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
                              "aspect-square rounded-2xl cursor-pointer relative transition-all duration-300 p-0 border-0",
                              brand.css,
                              selectedBrand === brand.id
                                ? "ring-2 ring-white ring-offset-4 ring-offset-[#0f0f11] scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                : "hover:scale-105 opacity-60 hover:opacity-100",
                            )}
                          >
                            <Hexagon className="absolute inset-0 m-auto w-6 h-6 text-white/50" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl shrink-0 flex items-center justify-center",
                          BRAND_PRESETS.find((b) => b.id === selectedBrand)?.css,
                        )}
                      >
                        <span className="text-white font-bold text-lg">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-white truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          hostfunc.com/{slug}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setStep(1)}
                        className="h-12 w-12 rounded-xl shrink-0 border border-white/10 hover:bg-white/5"
                        disabled={isPending}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        type="submit"
                        disabled={isPending}
                        className="w-full h-12 rounded-xl text-base font-semibold group relative overflow-hidden"
                      >
                        <span className="relative z-10 flex items-center justify-center">
                          {isPending ? (
                            <>
                              <Loader2 className="mr-2 w-5 h-5 animate-spin" /> Constructing
                              Interface...
                            </>
                          ) : (
                            <>Create Workspace</>
                          )}
                        </span>
                        {!isPending && (
                          <div className="absolute inset-0 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/10 to-primary-foreground/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
