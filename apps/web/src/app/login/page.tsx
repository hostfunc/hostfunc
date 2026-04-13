"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Hexagon, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setPending(true);
    try {
      await signIn.magicLink({
        email,
        callbackURL: "/dashboard",
      });
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden text-slate-200">
      {/* Background Visuals */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

      {/* Top Left Navigation Header */}
      <div className="absolute top-0 left-0 w-full p-6">
        <Link href="/" className="flex items-center gap-2 group w-max">
          <div className="bg-primary/20 p-1.5 rounded-lg text-primary transition-transform group-hover:scale-110 duration-300">
            <Hexagon className="w-5 h-5 fill-primary/20" />
          </div>
          <span className="font-mono text-xl font-bold tracking-tight text-white">hostfunc</span>
        </Link>
      </div>

      <motion.div
        className="w-full max-w-[400px] relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-[#0f0f11]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your email to sign in or create an account.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.form
                key="login-form"
                onSubmit={onSubmit}
                className="space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-2">
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="h-12 pl-11 bg-black/40 border-white/10 text-white focus-visible:ring-primary focus-visible:border-primary transition-all placeholder:text-muted-foreground/50 rounded-xl"
                      required
                      autoFocus
                      disabled={pending}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-sm font-semibold group mt-4 relative overflow-hidden transition-all bg-white text-black hover:bg-white/90"
                  disabled={pending || !email}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {pending ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" /> Sending Link...
                      </>
                    ) : (
                      <>
                        Continue with Email{" "}
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>

                <p className="text-center text-[11px] text-muted-foreground pt-4">
                  By continuing, you agree to our{" "}
                  <Link href="#" className="underline hover:text-white transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="underline hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </motion.form>
            ) : (
              <motion.div
                key="success-message"
                className="flex flex-col items-center justify-center py-6 text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a magic link to <span className="font-semibold text-white">{email}</span>.
                  Click the link to securely sign in.
                </p>
                <div className="mt-8 pt-6 border-t border-white/10 w-full">
                  <p className="text-[11px] text-muted-foreground">
                    In development mode, check your local{" "}
                    <code className="bg-white/10 px-1 py-0.5 rounded text-white font-mono">
                      pnpm dev
                    </code>{" "}
                    terminal for the login link!
                  </p>
                  <Button
                    variant="ghost"
                    type="button"
                    className="text-xs mt-4 hover:bg-white/5"
                    onClick={() => setSent(false)}
                  >
                    Use a different email
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  );
}
