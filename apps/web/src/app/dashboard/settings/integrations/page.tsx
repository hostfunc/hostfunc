"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Blocks, Bot, CheckCircle2, Cloud, CloudFog, Search } from "lucide-react";

export default function IntegrationsSettingsPage() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      {/* Header Module */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-2">
            Platform Integrations <Blocks className="w-6 h-6 text-amber-500" />
          </h3>
          <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Expand the hostfunc platform. Connect your own compute infrastructure for custom
            deployments entirely inside your own AWS/Cloudflare accounts, or bind OAuth Agents using
            MCP.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search catalog..." className="bg-white/5 border-white/10 pl-9 w-64" />
        </div>
      </div>

      <div className="space-y-10">
        {/* MCP Connectors */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Bot className="w-5 h-5 text-white" />
            <h4 className="text-xl font-semibold text-white">AI Agents (MCP)</h4>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Claude Integration */}
            <div className="rounded-2xl border border-amber-500/30 bg-[#0a0a0a] overflow-hidden group">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                    <span className="font-serif font-bold text-orange-500 text-xl">C</span>
                  </div>
                  <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </div>
                </div>
                <h5 className="text-lg font-semibold text-white mb-2">Anthropic Claude</h5>
                <p className="text-sm text-muted-foreground leading-relaxed h-10">
                  Allow Claude desktop to read server states and natively invoke your functions
                  using Model Context Protocol.
                </p>
              </div>
              <div className="bg-[#111111] border-t border-white/5 px-6 py-4 flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-mono">Bound to workspace</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent text-slate-300 hover:text-white border-white/10"
                >
                  Configure
                </Button>
              </div>
            </div>

            {/* ChatGPT Integration */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden group hover:bg-white/[0.04] transition-colors">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Bot className="w-6 h-6 text-slate-300" />
                  </div>
                </div>
                <h5 className="text-lg font-semibold text-white mb-2">OpenAI ChatGPT</h5>
                <p className="text-sm text-muted-foreground leading-relaxed h-10">
                  Give ChatGPT direct tool access to your Hostfunc environment via our hosted custom
                  GPT integration.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Requires OAuth linking</span>
                <Button className="bg-white text-black hover:bg-white/90 shadow-none text-xs h-8">
                  Install
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Cloud Adapters */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Cloud className="w-5 h-5 text-white" />
            <h4 className="text-xl font-semibold text-white">BYO Cloud Providers</h4>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Cloudflare Workers */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden group hover:bg-white/[0.04] transition-colors">
              <div className="p-6">
                <div className="w-12 h-12 mb-4 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <CloudFog className="w-6 h-6 text-orange-500" />
                </div>
                <h5 className="text-lg font-semibold text-white mb-2">Cloudflare Workers</h5>
                <p className="text-sm text-muted-foreground leading-relaxed h-16">
                  Bind your Cloudflare API token. We will bundle your Typescript into `esbuild`
                  artifacts and orchestrate them straight onto your own Edge nodes.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Native Adapter
                </span>
                <Button className="bg-white text-black hover:bg-white/90 shadow-none text-xs h-8">
                  Connect Key
                </Button>
              </div>
            </div>

            {/* AWS Lambda */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden group hover:bg-white/[0.04] transition-colors">
              <div className="p-6">
                <div className="w-12 h-12 mb-4 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Cloud className="w-6 h-6 text-amber-500" />
                </div>
                <h5 className="text-lg font-semibold text-white mb-2">AWS Lambda</h5>
                <p className="text-sm text-muted-foreground leading-relaxed h-16">
                  Link an IAM Role. Functions will automatically execute within your VPC allowing
                  direct, secure connections to your private RDS instances.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Beta Adapter
                </span>
                <Button className="bg-white text-black hover:bg-white/90 shadow-none text-xs h-8">
                  Assume Role
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
