import { Button } from "@/components/ui/button";
import { docsSections, getDocsPage } from "@/lib/docs-content";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Documentation | hostfunc",
  description: "Learn how to build, deploy, and manage serverless functions.",
};

export default function DocsPage({ params }: { params: { slug?: string[] } }) {
  const path = params.slug ? `/docs/${params.slug.join("/")}` : "/docs";
  const content = getDocsPage(path);
  const areaCards = docsSections
    .flatMap((section) => section.links)
    .filter((link) => link.href !== "/docs")
    .map((link) => {
      const page = getDocsPage(link.href);
      return {
        title: link.name,
        href: link.href,
        summary: page.summary,
      };
    });

  return (
    <div className="animate-in fade-in duration-500 pb-24">
      {/* Header Section */}
      <div className="mb-16">
        <p className="text-cyan-400 font-bold mb-4 text-xs tracking-widest uppercase flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          Documentation
        </p>
        <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-white mb-6 leading-tight">
          {content.title}
        </h1>
        <p className="text-xl text-slate-400 leading-relaxed max-w-2xl">{content.summary}</p>
      </div>

      <div className="w-full h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent my-12" />

      {/* Highlights Section */}
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">
            Explore the Platform
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {areaCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-2xl border border-white/10 bg-[#0d1117] p-5 hover:border-cyan-500/40 hover:bg-[#101621] transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {card.title}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{card.summary}</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Key capabilities</h2>
          <div className="grid gap-4">
            {content.highlights.map((item) => (
              <div
                key={item}
                className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] flex items-start gap-4 hover:bg-white/[0.04] transition-colors"
              >
                <div className="mt-1.5 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)] shrink-0" />
                <p className="text-slate-300 leading-relaxed font-medium">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="mt-20 pt-8 border-t border-white/5 flex justify-end">
        <Button
          asChild
          className="group h-14 px-8 rounded-full bg-white text-black hover:bg-slate-200 font-bold text-base transition-all"
        >
          <Link href={content.related[0]?.href ?? "/docs/getting-started"}>
            Next: {content.related[0]?.label ?? "Getting Started"}
            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
