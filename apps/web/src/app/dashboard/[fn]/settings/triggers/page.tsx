"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, CheckCircle2, ChevronRight, Clock, Copy, Link2, Mail } from "lucide-react";
import { use } from "react";
import { useState } from "react";

export default function TriggersFunctionSettingsPage({
  params,
}: { params: Promise<{ fn: string }> }) {
  const { fn } = use(params);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${fn}.hostfunc.com`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      {/* Header Module */}
      <div className="border-b border-white/10 pb-6">
        <h3 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-2">
          Invocation Triggers <Activity className="w-6 h-6 text-indigo-500" />
        </h3>
        <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
          Configure how your serverless code is executed. You can map functions to public web
          endpoints, bind them to strict scheduler crons (via Inngest), or even connect them to
          inbound email ingestion parsers.
        </p>
      </div>

      <div className="space-y-6">
        {/* HTTP Endpoint Trigger */}
        <div className="rounded-2xl border border-indigo-500/30 bg-[#0a0a0a] relative overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.05)]">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />

          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-500/30">
                  <Link2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                    HTTP Endpoint
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest px-2 py-0.5"
                    >
                      Online
                    </Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Invoke via standard web requests or APIs.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-white/10 bg-transparent text-white hover:bg-white/5"
              >
                Manage ACL
              </Button>
            </div>

            <div className="bg-[#111111] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 w-full relative">
                <Input
                  readOnly
                  value={`https://${fn}.hostfunc.com`}
                  className="font-mono bg-black/50 border-white/10 text-slate-300 h-11 pl-4 pr-12 focus-visible:ring-indigo-500"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                </div>
              </div>
              <Button
                onClick={handleCopy}
                className="h-11 px-6 w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-none"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copied ? "Copied" : "Copy URL"}
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground font-medium">
              <span>
                Authentication: <strong className="text-slate-300">Public (None)</strong>
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>
                Methods: <strong className="text-slate-300">GET, POST, OPTIONS</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Cron Schedule Trigger */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                  Cron Scheduler
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest px-2 py-0.5"
                  >
                    Inactive
                  </Badge>
                </h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm leading-relaxed">
                  Automatically dispatch this function periodically using our distributed task
                  queue. Perfect for syncing data or cleanup jobs.
                </p>
              </div>
            </div>

            <Button className="bg-white text-black hover:bg-white/90 h-10 px-6 font-medium shadow-[0_0_15px_rgba(255,255,255,0.1)] shrink-0 w-full md:w-auto">
              Configure Cron <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Email Ingestion Trigger */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors relative overflow-hidden group">
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                  Inbound Email Router
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest px-2 py-0.5"
                  >
                    Inactive
                  </Badge>
                </h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm leading-relaxed">
                  Bind this function to listen to specific inbound emails. We parse the headers and
                  attachments and pass it directly to your code payload.
                </p>
                <div className="mt-3 bg-black/40 inline-block px-3 py-1.5 rounded-md border border-white/5 text-xs font-mono text-muted-foreground">
                  demo+{fn}@mail.hostfunc.com
                </div>
              </div>
            </div>

            <Button className="bg-white text-black hover:bg-white/90 h-10 px-6 font-medium shadow-[0_0_15px_rgba(255,255,255,0.1)] shrink-0 w-full md:w-auto">
              Setup Email <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
