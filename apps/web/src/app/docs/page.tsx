import { Button } from "@/components/ui/button";
import { ChevronRight, FileText, Lightbulb, Terminal } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Documentation | hostfunc",
  description: "Learn how to build, deploy, and manage serverless functions.",
};

export default function DocsPage() {
  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="mb-12">
        <p className="text-primary font-semibold mb-2 text-sm tracking-wide uppercase">
          Getting Started
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          Introduction
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Welcome to the hostfunc documentation. This guide will help you understand our core
          concepts, deploy your first function, and scale your workloads globally.
        </p>
      </div>

      <hr className="border-white/10 my-10" />

      {/* Main Content Sections */}
      <div className="space-y-10 text-slate-300">
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4 tracking-tight flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" /> What is hostfunc?
          </h2>
          <p className="leading-relaxed mb-4">
            Hostfunc is a zero-configuration serverless execution environment designed specifically
            for Typescript. We exist to solve the overhead of setting up Docker containers, Express
            servers, and CI/CD pipelines just to listen to a Stripe Webhook or run a basic daily
            Cron job.
          </p>
          <p className="leading-relaxed">
            By deploying to our edge network, your code boots in under{" "}
            <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded font-mono text-sm">
              2ms
            </strong>{" "}
            and scales infinitely to handle any amount of traffic you throw at it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4 tracking-tight">
            Quick Installation
          </h2>
          <p className="leading-relaxed mb-4">
            You can interact with hostfunc through our intuitive UI Dashboard, or by utilizing our
            powerful CLI right from your terminal. Let's install the CLI via `npm`.
          </p>

          <div className="rounded-xl bg-[#0d1117] border border-white/10 overflow-hidden my-6 shadow-2xl shadow-indigo-500/10">
            <div className="flex items-center px-4 py-2 bg-[#161b22] border-b border-white/5">
              <Terminal className="w-4 h-4 text-muted-foreground mr-2" />
              <span className="text-xs font-mono text-muted-foreground">Terminal</span>
            </div>
            <div className="p-4 overflow-x-auto text-sm font-mono text-gray-300">
              <span className="text-pink-400">npm</span> install -g{" "}
              <span className="text-emerald-400">hostfunc-cli</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4 tracking-tight">Core Features</h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="bg-blue-500/20 p-2 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Native Webhooks</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Automatically validate signatures and parse payloads from thousands of API providers
                without writing middleware.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="bg-emerald-500/20 p-2 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Encrypted Configs</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Inject API keys and database strings directly into your environments completely
                secured at rest.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Pagination Footer */}
      <div className="mt-16 pt-8 border-t border-white/10 flex justify-end">
        <Button
          asChild
          className="group h-12 px-6 rounded-xl bg-white text-black hover:bg-white/90"
        >
          <Link href="#">
            Next: Deploy Your First Function
            <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
