"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { assertMarketingContent, marketingContent } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";
import { 
  ArrowRight, 
  Hexagon, 
  Terminal, 
  Activity, 
  Lock, 
  Zap, 
  Command, 
  Network 
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { data: session, isPending } = useSession();
  assertMarketingContent();
  const primaryHref = session ? "/dashboard" : marketingContent.primaryCta.href;

  // Map features to icons for the grid section
  const featureIcons = [Terminal, Activity, Lock, Zap, Command, Network];

  return (
    <main className="min-h-screen bg-[#09090b] text-slate-200 selection:bg-cyan-500/30 font-sans">
      {/* 1. Navigation */}
      <header className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Hexagon className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            <span className="font-bold text-xl tracking-tight text-white">hostfunc</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/docs" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Docs
            </Link>
            {isPending ? (
              <div className="h-9 w-24 bg-white/10 animate-pulse rounded-full" />
            ) : session ? (
              <Button asChild size="sm" className="bg-white text-black hover:bg-slate-200 rounded-full px-6 font-semibold">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="bg-white text-black hover:bg-slate-200 rounded-full px-6 font-semibold">
                <Link href="/login">Get started</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 pt-32 pb-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-cyan-400 mb-8">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          {marketingContent.badge}
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[1.05] max-w-5xl">
          Build tiny <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">TypeScript</span> functions and ship fast.
        </h1>
        
        <p className="mt-8 text-lg md:text-xl text-slate-400 max-w-3xl leading-relaxed">
          {marketingContent.subheadline}
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="h-14 px-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-base transition-all">
            <Link href={primaryHref}>
              {marketingContent.primaryCta.label} <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 px-8 rounded-full border-white/20 hover:bg-white/10 hover:text-white text-white bg-transparent font-semibold text-base transition-all">
            <Link href={marketingContent.secondaryCta.href}>{marketingContent.secondaryCta.label}</Link>
          </Button>
        </div>
      </section>

      {/* 3. Dashboard Mockup */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden shadow-2xl shadow-cyan-500/10">
          <div className="bg-[#1a1a1a] border-b border-white/5 px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <div className="mx-auto text-xs font-mono text-slate-500">hostfunc-dashboard</div>
          </div>
          <div className="p-8 aspect-[16/9] flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-10">
             {/* Abstract representation of code/dashboard since we don't have an image */}
             <div className="w-full h-full border border-white/5 bg-black/50 rounded-lg p-6 font-mono text-sm text-cyan-400 flex flex-col gap-4">
               <div className="flex justify-between items-center border-b border-white/5 pb-4">
                 <span className="text-white">Running Execution: req_9A3B2</span>
                 <span className="text-green-400">200 OK - 42ms</span>
               </div>
               <p className="text-slate-400">{">"} Initializing runtime environment...</p>
               <p className="text-slate-400">{">"} Fetching secrets for my-org...</p>
               <p className="text-cyan-400">{">"} Function executed successfully.</p>
               <div className="mt-auto h-2 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-cyan-500 w-full animate-pulse" />
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* 4. Trust Signals Banner */}
      <section className="border-y border-white/5 bg-white/[0.02] py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm font-semibold tracking-widest text-slate-500 uppercase mb-6">Built for scale & security</p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 text-sm md:text-base font-medium text-slate-300">
            {marketingContent.trustItems.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Alternating Feature Blocks (Like Metabox's Blue/Green sections) */}
      <section className="bg-[#2563eb] text-white py-24">
        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-xs font-bold tracking-widest uppercase text-blue-200 mb-3">Many ways in</h2>
            <h3 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Trigger workflows seamlessly</h3>
            <p className="text-lg text-blue-100 mb-8 max-w-md">
              Connect your functions to the rest of your stack using native triggers designed for modern applications.
            </p>
            <div className="space-y-6">
              {marketingContent.triggerItems.map((item) => (
                <div key={item.title} className="bg-black/10 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
                  <h4 className="font-bold text-xl mb-1">{item.title}</h4>
                  <p className="text-blue-100">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative h-full min-h-[400px] rounded-2xl bg-black shadow-2xl overflow-hidden border border-white/20">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent pointer-events-none" />
             <div className="p-8 font-mono text-sm leading-relaxed text-slate-300">
                <span className="text-blue-400">POST</span> /run/my-org/process-data<br/><br/>
                <span className="text-slate-500">{'// Payload'}</span><br/>
                &#123;<br/>
                &nbsp;&nbsp;<span className="text-green-300">"source"</span>: <span className="text-yellow-300">"webhook"</span>,<br/>
                &nbsp;&nbsp;<span className="text-green-300">"timestamp"</span>: <span className="text-yellow-300">"2026-04-14T12:36:29Z"</span><br/>
                &#125;<br/><br/>
                <span className="text-slate-500">{'// Response: 200 OK'}</span>
             </div>
          </div>
        </div>
      </section>

      <section className="bg-[#10b981] text-white py-24">
        <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 rounded-2xl bg-[#0d1117] shadow-2xl overflow-hidden border border-white/10">
            <div className="bg-[#161b22] border-b border-white/10 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <div className="mx-auto text-xs font-mono text-slate-400">composition.ts</div>
            </div>
            <pre className="p-6 text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {marketingContent.compositionSnippet}
            </pre>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-xs font-bold tracking-widest uppercase text-green-200 mb-3">Collaboration</h2>
            <h3 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Compose and link functions</h3>
            <p className="text-lg text-green-50 max-w-md">
              Chain multiple functions together to build complex, reliable pipelines without managing server infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-white">What you can do today</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketingContent.features.map((feature, idx) => {
            const Icon = featureIcons[idx % featureIcons.length];
            return (
              <div key={feature.title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                  {Icon && <Icon className={cn("w-6 h-6 text-cyan-400")} />}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Workflow */}
      <section className="border-t border-white/5 py-24 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-16">Build workflow</h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-white/10 -translate-y-1/2 z-0" />
            
            {marketingContent.workflow.map((item) => (
              <div key={`workflow-step-${item.step}`} className="relative z-10 rounded-2xl border border-white/10 bg-[#09090b] p-8 flex flex-col items-center shadow-xl">
                <div className="w-16 h-16 rounded-full bg-cyan-500 text-black flex items-center justify-center text-2xl font-black mb-6">
                  {item.step.replace(/^\d+\.\s/, '')}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.step.replace(/^\d+\.\s/, '')}</h3>
                <p className="text-slate-400">{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-12 font-medium">{marketingContent.pricingNote}</p>
        </div>
      </section>

      {/* 8. Bottom CTA */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-5xl rounded-[3rem] border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6">Ready to ship?</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Start in the dashboard, wire triggers, and monitor every execution instantly.
            </p>
            <div className="flex justify-center gap-4 flex-col sm:flex-row">
              <Button asChild size="lg" className="h-14 px-10 rounded-full bg-white hover:bg-slate-200 text-black font-bold text-lg">
                <Link href={primaryHref}>{marketingContent.primaryCta.label}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="border-t border-white/10 bg-[#050505] py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Hexagon className="w-5 h-5 text-slate-500" />
            <p className="text-sm text-slate-500 font-medium">hostfunc © {new Date().getFullYear()}</p>
          </div>
          <div className="flex items-center gap-8 text-sm font-medium text-slate-400">
            {marketingContent.footerLinks.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}