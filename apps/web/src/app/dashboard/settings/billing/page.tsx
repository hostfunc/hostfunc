"use client";

import { Button } from "@/components/ui/button";
import { CreditCard, Zap, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export default function BillingSettingsPage() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">
      
      {/* Header Module */}
      <div className="border-b border-white/10 pb-6">
        <h3 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-2">
           Billing & Usage <CreditCard className="w-6 h-6 text-fuchsia-500" />
        </h3>
        <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
          Monitor your current resource consumption and manage your Stripe subscription. Upgrade to Pro to bypass concurrency execution limits and retain logs indefinitely.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column: Resource Usage */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-[0_0_30px_rgba(255,255,255,0.02)] p-6 relative overflow-hidden">
             
             <h4 className="text-lg font-semibold text-white tracking-tight mb-6">Current Cycle Usage</h4>
             
             {/* Compute Usage Bar */}
             <div className="mb-8">
               <div className="flex justify-between items-end mb-2">
                 <div>
                   <span className="text-sm font-medium text-slate-300">Compute Duration</span>
                   <p className="text-xs text-muted-foreground mt-0.5">Total execution wall-time across all functions</p>
                 </div>
                 <div className="text-right">
                   <span className="font-mono text-sm text-white">45.2s</span>
                   <span className="text-muted-foreground text-xs font-mono ml-1">/ 1,000s</span>
                 </div>
               </div>
               <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-500 w-[4.5%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
               </div>
             </div>

             {/* Invocations Bar */}
             <div className="mb-8">
               <div className="flex justify-between items-end mb-2">
                 <div>
                   <span className="text-sm font-medium text-slate-300">Edge Invocations</span>
                   <p className="text-xs text-muted-foreground mt-0.5">Number of times your endpoints were hit</p>
                 </div>
                 <div className="text-right">
                   <span className="font-mono text-sm text-yellow-400">84,020</span>
                   <span className="text-muted-foreground text-xs font-mono ml-1">/ 100,000</span>
                 </div>
               </div>
               <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-yellow-400 w-[84%] rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
               </div>
             </div>
             
             <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
               <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
               <div>
                  <h5 className="text-sm font-medium text-yellow-500">Approaching Free-Tier Invocation Limit</h5>
                  <p className="text-xs text-yellow-500/80 mt-1 leading-relaxed">
                    You have consumed 84% of your monthly free requests. To prevent your functions from returning 429 constraints, upgrade to Pro.
                  </p>
               </div>
             </div>

          </div>
        </div>

        {/* Right Column: Pricing Plans */}
        <div className="space-y-6">
           
           <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
             <div className="mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Plan</span>
                <h4 className="text-2xl font-bold text-white mt-1">Hobby Phase</h4>
             </div>
             <ul className="space-y-3 mb-6 text-sm text-slate-300">
               <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-muted-foreground" /> 100k invocations/mo</li>
               <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-muted-foreground" /> 1,000s compute</li>
               <li className="flex items-center gap-2 text-muted-foreground line-through"><CheckCircle2 className="w-4 h-4 opacity-50" /> No Cron dispatcher</li>
             </ul>
           </div>

           <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-b from-fuchsia-500/10 to-transparent p-6 relative overflow-hidden shadow-[0_0_40px_rgba(217,70,239,0.1)]">
             <div className="absolute top-0 right-0 p-4">
               <Zap className="w-8 h-8 text-fuchsia-500/20" />
             </div>
             <div className="mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-400">Upgrade</span>
                <h4 className="text-2xl font-bold text-white mt-1">Pro Tier</h4>
             </div>
             <div className="mb-6">
                <span className="text-3xl font-bold text-white">$20</span>
                <span className="text-muted-foreground">/mo</span>
             </div>
             <ul className="space-y-3 mb-8 text-sm text-slate-300">
               <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-fuchsia-400" /> 10M invocations/mo</li>
               <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-fuchsia-400" /> 100,000s compute</li>
               <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-fuchsia-400" /> Inngest Distributed Crons</li>
               <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-fuchsia-400" /> Stripe Webhook Integration</li>
             </ul>
             
             <Button className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-lg transition-colors group h-11">
               Upgrade to Pro <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
             </Button>
           </div>
           
        </div>
      </div>
    </div>
  );
}
