"use client";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackClientEvent } from "@/lib/analytics-client";
import { signIn } from "@/lib/auth-client";
import { formatAuthError } from "@/lib/format-auth-error";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

type AuthStep = "options" | "email";

// Friendly copy for OAuth failures better-auth surfaces via `?error=<code>` on the error redirect.
// `signIn.social` is given an `errorCallbackURL` of `/login`, so these land back on this screen.
const OAUTH_ERROR_COPY: Record<string, { title: string; detail: string }> = {
  email_not_found: {
    title: "We couldn't get an email from that provider",
    detail:
      "GitHub didn't share a verified email with us. Make your GitHub email public or verified, or sign in with a magic link instead.",
  },
  account_already_linked_to_different_user: {
    title: "That account is already linked elsewhere",
    detail: "This provider account is connected to a different hostfunc user. Try another method.",
  },
};

function oauthErrorCopy(code: string): { title: string; detail: string } {
  return (
    OAUTH_ERROR_COPY[code] ?? {
      title: "Sign-in failed",
      detail: "Something went wrong with that provider. Try again or use a magic link.",
    }
  );
}

const loginEmailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email")
  .email("Enter a valid email address")
  .max(320, "Email is too long");

function LoginPageClient() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>("options");
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<ReturnType<typeof formatAuthError> | null>(null);
  const [oauthRedirecting, setOauthRedirecting] = useState<"github" | "google" | null>(null);

  const callbackURL = useMemo(() => safeCallbackUrl(params.get("from")), [params]);

  // Surface OAuth failures that better-auth redirects back here via `?error=<code>`.
  const oauthError = params.get("error");
  useEffect(() => {
    if (oauthError) setAuthError(oauthErrorCopy(oauthError));
  }, [oauthError]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailFieldError(null);
    setAuthError(null);

    const parsed = loginEmailSchema.safeParse(email);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const first = flat.formErrors[0] ?? parsed.error.issues[0]?.message;
      setEmailFieldError(first ?? "Invalid email");
      return;
    }

    setPending(true);
    try {
      await trackClientEvent("auth_magic_link_attempt", { method: "email" });
      await signIn.magicLink({
        email: parsed.data,
        callbackURL,
      });
      await trackClientEvent("auth_magic_link_sent", { method: "email" });
      setSent(true);
    } catch (err) {
      const formatted = formatAuthError(err);
      const reason = formatted.detail ?? formatted.title;
      await trackClientEvent("auth_magic_link_failed", { reason });
      const emailMsg = formatted.fields?.email ?? formatted.fields?.[""];
      if (emailMsg) setEmailFieldError(emailMsg);
      else setAuthError(formatted);
      toast.error(formatted.detail ?? formatted.title);
    } finally {
      setPending(false);
    }
  }

  async function onSocialClick(provider: "github" | "google") {
    setAuthError(null);
    setPending(true);
    setOauthRedirecting(provider);
    try {
      await trackClientEvent("auth_social_attempt", { provider });
      await signIn.social({
        provider,
        callbackURL,
        // Route OAuth failures back to /login (with `?error=<code>`) instead of the marketing root,
        // so users land on a screen that explains what happened.
        errorCallbackURL: `${window.location.origin}/login`,
      });
    } catch (err) {
      const formatted = formatAuthError(err);
      const reason = formatted.detail ?? formatted.title;
      await trackClientEvent("auth_social_failed", { provider, reason });
      setAuthError(formatted);
      toast.error(formatted.detail ?? formatted.title);
      setPending(false);
      setOauthRedirecting(null);
    }
  }

  // Conditional UI (the industry-standard passkey sign-in): saved passkeys surface directly in the
  // email field's autofill dropdown — no dedicated button. Picking one signs the user in and lands
  // them where they intended. Browsers without support simply no-op; failures here are silent.
  useEffect(() => {
    void signIn
      .passkey({ autoFill: true })
      .then((result) => {
        if (result && !result.error) window.location.href = callbackURL;
      })
      .catch(() => {});
  }, [callbackURL]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-ink)] text-[var(--color-bone)]">
      <div className="gradient-radial-amber pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,197,107,0.12),transparent_40%),radial-gradient(circle_at_85%_75%,rgba(255,197,107,0.07),transparent_45%)]" />

      <header className="relative z-20 border-b border-[var(--color-border)] bg-[var(--color-ink)]/75 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <Link href="/" className="group flex items-center gap-2">
            <Logo
              iconClassName="transition-transform duration-300 group-hover:scale-105"
              wordmarkClassName="text-xl"
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-bone-muted)] transition-colors hover:text-[var(--color-bone)]"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-7xl items-center justify-center px-6 py-16">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_440px] lg:gap-10">
          <motion.div
            className="hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/80 p-8 lg:block"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-ink-overlay)] px-3 py-1 text-xs text-[var(--color-bone-muted)]">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-amber)] opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[var(--color-amber)]" />
              </span>
              Secure workspace sign-in
            </div>
            <h1 className="mt-6 font-display text-5xl leading-[1.04] tracking-tight text-[var(--color-bone)]">
              Welcome back.
              <span className="block text-[var(--color-amber)]">Build at function speed.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--color-bone-muted)]">
              Sign in with GitHub, Google, or magic link.
            </p>
            <div className="mt-8 grid gap-3 text-xs uppercase tracking-wider text-[var(--color-bone-faint)]">
              <p>OAuth + magic links</p>
              <p>Org-aware sessions</p>
              <p>Production-grade audit events</p>
            </div>
          </motion.div>

          <motion.div
            className="relative w-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/90 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
              <AnimatePresence>
                {oauthRedirecting ? (
                  <motion.output
                    key="oauth-redirect"
                    aria-live="polite"
                    aria-busy="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[var(--color-ink)]/88 px-6 text-center backdrop-blur-md"
                  >
                    <Loader2
                      className="size-10 animate-spin text-[var(--color-amber)]"
                      aria-hidden
                    />
                    <p className="font-medium text-[var(--color-bone)]">
                      {oauthRedirecting === "github"
                        ? "Redirecting to GitHub…"
                        : "Redirecting to Google…"}
                    </p>
                    <p className="max-w-xs text-xs text-[var(--color-bone-muted)]">
                      Continue in the provider window. You can close this tab if nothing opens.
                    </p>
                  </motion.output>
                ) : null}
              </AnimatePresence>
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-amber)]">
                  Authentication
                </p>
                <h2 className="mt-3 font-display text-3xl leading-tight text-[var(--color-bone)]">
                  Access your workspace
                </h2>
                <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
                  Choose a sign-in method to continue.
                </p>
              </div>

              {authError ? (
                <div
                  role="alert"
                  className="mb-6 flex gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-left text-sm text-red-100/95"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" aria-hidden />
                  <div>
                    <p className="font-medium text-[var(--color-bone)]">{authError.title}</p>
                    {authError.detail && authError.detail !== authError.title ? (
                      <p className="mt-1 text-xs leading-relaxed text-[var(--color-bone-muted)]">
                        {authError.detail}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <AnimatePresence mode="wait">
                {!sent ? (
                  authStep === "options" ? (
                    <motion.div
                      key="login-options"
                      className="space-y-3"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 w-full cursor-pointer rounded-xl border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone)] hover:bg-white/[0.05]"
                        disabled={pending}
                        onClick={() => onSocialClick("github")}
                      >
                        <img
                          src="/Github%20logo.svg"
                          alt=""
                          aria-hidden="true"
                          className="mr-2 h-4 w-4 object-contain brightness-0 invert"
                        />
                        Continue with GitHub
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 w-full cursor-pointer rounded-xl border-[var(--color-border)] bg-white/[0.02] text-[var(--color-bone)] hover:bg-white/[0.05]"
                        disabled={pending}
                        onClick={() => onSocialClick("google")}
                      >
                        <img
                          src="/Google%20logo.svg"
                          alt=""
                          aria-hidden="true"
                          className="mr-2 h-4 w-4 object-contain"
                        />
                        Continue with Google
                      </Button>
                      <Button
                        type="button"
                        className="group h-12 w-full cursor-pointer rounded-xl bg-[var(--color-amber)] text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
                        disabled={pending}
                        onClick={() => {
                          setAuthError(null);
                          setAuthStep("email");
                        }}
                      >
                        Continue with Email
                        <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="login-form"
                      onSubmit={onSubmit}
                      className="space-y-4"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                      <div className="space-y-2">
                        <label
                          htmlFor="email"
                          className="text-xs uppercase tracking-[0.2em] text-[var(--color-bone-faint)]"
                        >
                          Email
                        </label>
                        <div className="relative flex items-center">
                          <Mail className="absolute left-4 h-4 w-4 text-[var(--color-bone-faint)]" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setEmailFieldError(null);
                              setAuthError(null);
                            }}
                            placeholder="name@example.com"
                            // "webauthn" lets the browser offer saved passkeys in the autofill
                            // dropdown (paired with signIn.passkey({ autoFill: true }) on mount).
                            autoComplete="email webauthn"
                            className="h-12 rounded-xl border-[var(--color-border)] bg-[var(--color-ink)] pl-11 text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:border-[var(--color-amber)] focus-visible:ring-[var(--color-amber)]/35"
                            aria-invalid={emailFieldError ? true : undefined}
                            aria-describedby={emailFieldError ? "email-error" : undefined}
                            autoFocus
                            disabled={pending}
                          />
                        </div>
                        {emailFieldError ? (
                          <p id="email-error" className="text-xs text-red-400" role="alert">
                            {emailFieldError}
                          </p>
                        ) : null}
                      </div>

                      <Button
                        type="submit"
                        className="group relative mt-2 h-12 w-full cursor-pointer overflow-hidden rounded-xl bg-[var(--color-amber)] text-sm font-semibold text-[var(--color-ink)] transition-all hover:bg-[var(--color-amber-hover)]"
                        disabled={pending || !email.trim()}
                      >
                        <span className="relative z-10 flex items-center justify-center">
                          {pending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending Link...
                            </>
                          ) : (
                            <>
                              Continue with Email
                              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </>
                          )}
                        </span>
                      </Button>

                      <Button
                        variant="ghost"
                        type="button"
                        className="h-10 w-full cursor-pointer rounded-xl text-xs text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
                        disabled={pending}
                        onClick={() => {
                          setAuthError(null);
                          setEmailFieldError(null);
                          setAuthStep("options");
                        }}
                      >
                        Back to sign-in options
                      </Button>
                    </motion.form>
                  )
                ) : (
                  <motion.div
                    key="success-message"
                    className="flex flex-col items-center justify-center py-4 text-center"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/12 ring-1 ring-emerald-500/30">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--color-bone)]">
                      Check your email
                    </h2>
                    <p className="mt-2 text-sm text-[var(--color-bone-muted)]">
                      We sent a magic link to{" "}
                      <span className="font-semibold text-[var(--color-bone)]">{email}</span>. Click
                      the link to securely sign in.
                    </p>
                    <div className="mt-7 w-full border-t border-[var(--color-border)] pt-5">
                      {process.env.NODE_ENV !== "production" && (
                        <p className="text-[11px] text-[var(--color-bone-faint)]">
                          In development mode, check your local{" "}
                          <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[var(--color-bone)]">
                            pnpm dev
                          </code>{" "}
                          terminal for the login link.
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        type="button"
                        className="mt-4 text-xs text-[var(--color-bone-muted)] hover:bg-white/[0.04] hover:text-[var(--color-bone)]"
                        onClick={() => {
                          setSent(false);
                          setAuthStep("options");
                        }}
                      >
                        Use a different email
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="pt-6 text-center text-[11px] text-[var(--color-bone-faint)]">
                By continuing, you agree to our{" "}
                <Link
                  href="#"
                  className="cursor-pointer underline underline-offset-4 transition-colors hover:text-[var(--color-bone)]"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="#"
                  className="cursor-pointer underline underline-offset-4 transition-colors hover:text-[var(--color-bone)]"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-ink)] text-[var(--color-bone-muted)]">
          <Logo wordmark={false} iconClassName="h-10 w-10" />
          <div className="flex items-center gap-2 text-sm text-[var(--color-bone)]">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading sign-in…
          </div>
        </main>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
