"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { type Variants, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Code,
  Copy,
  Globe,
  Hexagon,
  Infinity as InfinityIcon,
  Lock,
  Terminal,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const FADE_DOWN: Variants = {
  hidden: { opacity: 0, y: -20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", duration: 0.8 } },
};

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", duration: 0.8 } },
};

const STAGGER: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

export default function HomePage() {
  const [copied, setCopied] = useState(false);
  const { data: session, isPending } = useSession();

  const mockCode = `import fn, { secret } from "@hostfunc/fn";
import Stripe from 'stripe';

export async function main(req: Request) {
  // Validate webhooks effortlessly
  const payload = await req.json();
  const apiKey = secret('STRIPE_KEY');
  
  if (payload.type === "payment.succeeded") {
     console.log("Processing payment!");
  }

  return { received: true };
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mockCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-slate-200 selection:bg-primary/30 selection:text-primary overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-50 blur-[100px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none z-0" />

      {/* Navigation */}
      <header className="relative z-50 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/20 p-1.5 rounded-lg text-primary transition-transform group-hover:scale-110 duration-300">
              <Hexagon className="w-5 h-5 fill-primary/20" />
            </div>
            <span className="font-mono text-xl font-bold tracking-tight text-white">hostfunc</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/docs"
              className="text-sm font-medium text-muted-foreground hover:text-white transition-colors"
            >
              Docs
            </Link>
            {isPending ? (
              <div className="h-9 w-24 bg-white/5 animate-pulse rounded-full" />
            ) : session ? (
              <Button
                asChild
                size="sm"
                className="bg-white text-black hover:bg-white/90 rounded-full px-5"
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-white transition-colors hidden sm:block"
                >
                  Log in
                </Link>
                <Button
                  asChild
                  size="sm"
                  className="bg-white text-black hover:bg-white/90 rounded-full px-5"
                >
                  <Link href="/login">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-24 md:pt-48 md:pb-32">
        <motion.div
          className="flex flex-col items-center text-center"
          initial="hidden"
          animate="show"
          variants={STAGGER}
        >
          <motion.div variants={FADE_DOWN} className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-md">
              <SparklesIcon className="w-3.5 h-3.5" />
              Open source · Apache 2.0
            </span>
          </motion.div>

          <motion.h1
            variants={FADE_DOWN}
            className="text-balance text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 drop-shadow-sm max-w-4xl"
          >
            The cloud for tiny composable functions.
          </motion.h1>

          <motion.p
            variants={FADE_UP}
            className="mt-8 text-balance text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed"
          >
            Write a TypeScript function. Deploy in seconds. Seamlessly trigger workloads via HTTP,
            cron intervals, or direct AI bindings with zero configuration.
          </motion.p>

          <motion.div
            variants={FADE_UP}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-14 px-8 text-base rounded-full shadow-[0_0_40px_rgba(var(--primary),0.3)] hover:shadow-[0_0_60px_rgba(var(--primary),0.5)] transition-all bg-primary text-primary-foreground"
            >
              <Link href={session ? "/dashboard" : "/login"}>
                Start building <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-14 px-8 text-base rounded-full border-white/10 hover:bg-white/5 text-white bg-transparent backdrop-blur-md"
            >
              <Link href="https://github.com/your-username/hostfunc">
                <Code className="mr-2 w-4 h-4" /> View Documentation
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Hero Terminal UI */}
        <motion.div
          className="mt-24 mx-auto max-w-4xl relative"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-indigo-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
          <div className="relative rounded-2xl bg-[#0d1117] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#161b22]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="text-xs font-mono text-muted-foreground flex items-center">
                <Terminal className="w-3 h-3 mr-2" /> index.ts
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                className="text-muted-foreground hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-x-auto text-sm font-mono leading-relaxed">
              <pre className="text-gray-300">
                <code>
                  <span className="text-[#ff7b72]">import</span> fn, {"{"} secret {"}"}{" "}
                  <span className="text-[#ff7b72]">from</span>{" "}
                  <span className="text-[#a5d6ff]">"@hostfunc/fn"</span>;<br />
                  <span className="text-[#ff7b72]">import</span> Stripe{" "}
                  <span className="text-[#ff7b72]">from</span>{" "}
                  <span className="text-[#a5d6ff]">'stripe'</span>;<br />
                  <br />
                  <span className="text-[#ff7b72]">export async function</span>{" "}
                  <span className="text-[#d2a8ff]">main</span>(req: Request) {"{"}
                  <br />
                  <span className="text-[#8b949e]"> {/* Validate webhooks effortlessly */}</span>
                  <br />
                  <span className="text-[#ff7b72]"> const</span> payload ={" "}
                  <span className="text-[#ff7b72]">await</span> req.
                  <span className="text-[#d2a8ff]">json</span>();
                  <br />
                  <span className="text-[#ff7b72]"> const</span> apiKey ={" "}
                  <span className="text-[#d2a8ff]">secret</span>(
                  <span className="text-[#a5d6ff]">'STRIPE_KEY'</span>);
                  <br />
                  <br />
                  <span className="text-[#ff7b72]"> if</span> (payload.type ==={" "}
                  <span className="text-[#a5d6ff]">"payment.succeeded"</span>) {"{"}
                  <br />
                  {"    "}console.<span className="text-[#79c0ff]">log</span>(
                  <span className="text-[#a5d6ff]">"Processing payment!"</span>);
                  <br />
                  {"  }"}
                  <br />
                  <br />
                  <span className="text-[#ff7b72]"> return</span> {"{"} received:{" "}
                  <span className="text-[#79c0ff]">true</span> {"}"};<br />
                  {"}"}
                </code>
              </pre>
            </div>
            {copied && (
              <div className="absolute top-16 right-4 bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded backdrop-blur border border-emerald-500/20 animate-in fade-in slide-in-from-top-2">
                Copied to clipboard
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* Features Grid Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-32 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Infrastructure without the overhead
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to run reliable serverless workloads in production right out of the
            box.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Zap className="w-6 h-6 text-yellow-500" />}
            title="Instant Deployments"
            description="Push your Typescript files and they are live globally across edge networks in milliseconds."
          />
          <FeatureCard
            icon={<Globe className="w-6 h-6 text-blue-500" />}
            title="Native Webhooks"
            description="Automatically parse and validate incoming HTTP triggers from Stripe, GitHub, or any API."
          />
          <FeatureCard
            icon={<Activity className="w-6 h-6 text-emerald-500" />}
            title="Cron Scheduling"
            description="Run precise periodic background jobs. Need DB syncing at 3 AM? Done."
          />
          <FeatureCard
            icon={<Lock className="w-6 h-6 text-rose-500" />}
            title="Encrypted Secrets"
            description="Inject environment variables securely natively avoiding exposed keys in your repositories."
          />
          <FeatureCard
            icon={<BarChart3 className="w-6 h-6 text-indigo-500" />}
            title="Deep Analytics"
            description="Watch every execution, latency metric, and error trace inside a gorgeous live dashboard."
          />
          <FeatureCard
            icon={<InfinityIcon className="w-6 h-6 text-purple-500" />}
            title="AI Binding Ready"
            description="Easily allow LLM agents to execute your functions dynamically with built in permissions natively."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/50 py-12 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Hexagon className="w-5 h-5 text-primary" />
            <span className="font-mono font-semibold text-white">
              hostfunc © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-white transition-colors">
              Documentation
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              GitHub
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Twitter
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.04] hover:border-white/20 relative overflow-hidden backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="mb-5 inline-flex items-center justify-center p-3 rounded-xl bg-white/5 ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-white group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}
