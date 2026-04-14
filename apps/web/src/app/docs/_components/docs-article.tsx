import { getDocsPage } from "@/lib/docs-content";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function DocsArticle({ path }: { path: string }) {
  const page = getDocsPage(path);
  
  return (
    <article className="space-y-12 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <header className="space-y-6">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-tight">
          {page.title}
        </h1>
        <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl">
          {page.summary}
        </p>
      </header>

      <div className="w-full h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

      {/* Details Section */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6 tracking-tight flex items-center gap-3">
          <div className="w-1.5 h-6 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          Implementation Details
        </h2>
        <div className="grid gap-4">
          {page.highlights.map((item, idx) => (
            <div 
              key={`${path}-highlight-${idx}`} 
              className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex items-start gap-4 hover:bg-white/[0.04] transition-colors"
            >
              <div className="mt-1.5 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)] shrink-0" />
              <p className="text-slate-300 leading-relaxed font-medium">
                {item}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Related Links Section */}
      <section className="pt-4">
        <h2 className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-6">
          Related Documentation
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {page.related.map((item) => (
            <Link 
              key={`${path}:${item.href}`} 
              href={item.href}
              className="group p-5 rounded-xl border border-white/10 bg-[#09090b] hover:bg-white/5 hover:border-white/20 transition-all flex items-center justify-between shadow-sm"
            >
              <span className="font-medium text-slate-300 group-hover:text-white transition-colors">
                {item.label}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/10 border border-transparent group-hover:border-cyan-500/20 transition-all">
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}