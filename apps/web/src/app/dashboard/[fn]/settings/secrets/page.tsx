"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Trash2, Key, ShieldCheck, Lock, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SecretsFunctionSettingsPage() {
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const toggleVisibility = (key: string) => {
    setShowValues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const secrets = [
    { key: "STRIPE_SECRET_KEY", hint: "sk_test_..." },
    { key: "DATABASE_URL", hint: "postgres://..." },
    { key: "DISCORD_WEBHOOK_URL", hint: "https://discord.com/api..." }
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* Header Module */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <h3 className="text-3xl font-semibold tracking-tight text-white flex items-center gap-2">
             Secrets Vault <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </h3>
          <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Environment variables are encrypted at rest using our native envelope encryption KMS engine. Your plain-text keys are never visible in logs or storage, and are only injected securely directly into the runtime context at invocation.
          </p>
        </div>
      </div>

      {/* Primary Vault Display */}
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        
        <div className="px-6 py-4 border-b border-white/5 bg-[#111111] flex items-center justify-between relative z-10">
           <div className="flex items-center gap-2">
             <Key className="w-4 h-4 text-emerald-500" />
             <h4 className="font-medium text-white tracking-tight">Active Environments</h4>
           </div>
           <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">Secure</span>
        </div>

        <div className="divide-y divide-white/5 relative z-10">
          <AnimatePresence>
            {secrets.map((secret, i) => (
              <motion.div
                key={secret.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex-1 mr-6">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-mono text-sm font-semibold text-slate-200">{secret.key}</p>
                    <Lock className="w-3 h-3 text-muted-foreground opacity-50" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showValues[secret.key] ? "text" : "password"}
                      value={showValues[secret.key] ? secret.hint + "abcdef123" : "•••••••••••••••••••••••••••••"}
                      readOnly
                      className="h-9 max-w-md font-mono text-xs text-muted-foreground bg-black/50 border-white/10 cursor-default focus-visible:ring-0 shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                    onClick={() => toggleVisibility(secret.key)}
                  >
                    {showValues[secret.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 w-9 p-0 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Add New Secret Module */}
      <h4 className="text-lg font-medium text-white tracking-tight mt-10 mb-4">Add Variable</h4>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
          <div className="flex-1 w-full space-y-2">
             <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Key</label>
             <Input placeholder="e.g. API_KEY" className="font-mono h-12 bg-black/40 border-white/10 focus-visible:ring-emerald-500 focus-visible:border-emerald-500" />
          </div>
          <div className="flex-1 w-full space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Encrypted Value</label>
             <Input placeholder="Value" type="password" className="font-mono h-12 bg-black/40 border-white/10 focus-visible:ring-emerald-500 focus-visible:border-emerald-500" />
          </div>
          <div className="sm:self-end w-full sm:w-auto mt-2 sm:mt-0">
             <Button className="h-12 w-full sm:w-auto px-8 bg-white text-black hover:bg-emerald-500 hover:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
               <Plus className="w-4 h-4 mr-2" /> Add 
             </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
