import { getDocsPage } from "@/lib/docs-content";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { DocsCodeBlock } from "./docs-code-block";

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

      {page.guideSections?.length ? (
        <>
          <div className="w-full h-px bg-gradient-to-r from-cyan-400/30 via-cyan-500/10 to-transparent" />
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-6 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              Step-by-Step Guide
            </h2>
            <div className="space-y-5">
              {page.guideSections.map((section) => (
                <section
                  key={`${path}-guide-${section.title}`}
                  className="rounded-2xl border border-white/10 bg-[#0b0f15] p-5 space-y-4"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{section.description}</p>
                  </div>

                  {section.bullets?.length ? (
                    <ul className="space-y-2">
                      {section.bullets.map((item) => (
                        <li
                          key={`${section.title}-bullet-${item}`}
                          className="text-sm text-slate-300"
                        >
                          - {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {section.code ? <DocsCodeBlock code={section.code} /> : null}
                </section>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {page.sdkGuide ? (
        <>
          <div className="w-full h-px bg-gradient-to-r from-cyan-400/30 via-cyan-500/10 to-transparent" />

          <section className="space-y-8">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-6 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              SDK API Reference
            </h2>

            {page.sdkGuide.quickstart ? (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                <p className="text-sm leading-relaxed text-cyan-100">{page.sdkGuide.quickstart}</p>
              </div>
            ) : null}

            <div className="grid gap-6">
              {page.sdkGuide.apiReference.map((entry) => (
                <section
                  key={`${path}-api-${entry.name}`}
                  className="rounded-2xl border border-white/10 bg-[#0b0f15] p-5 space-y-5"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">{entry.name}</h3>
                    <code className="block overflow-x-auto rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-cyan-200 whitespace-pre-wrap">
                      {entry.signature}
                    </code>
                    <p className="text-sm text-slate-300 leading-relaxed">{entry.description}</p>
                  </div>

                  {entry.args?.length ? (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Arguments
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-white/5 text-slate-300">
                            <tr>
                              <th className="px-3 py-2 font-medium">Name</th>
                              <th className="px-3 py-2 font-medium">Type</th>
                              <th className="px-3 py-2 font-medium">Required</th>
                              <th className="px-3 py-2 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.args.map((arg) => (
                              <tr
                                key={`${entry.name}-arg-${arg.name}`}
                                className="border-t border-white/10"
                              >
                                <td className="px-3 py-2 text-white">{arg.name}</td>
                                <td className="px-3 py-2 text-slate-300">{arg.type}</td>
                                <td className="px-3 py-2 text-slate-300">
                                  {arg.required ? "Yes" : "No"}
                                </td>
                                <td className="px-3 py-2 text-slate-300">{arg.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {entry.returns ? (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Returns
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed">{entry.returns}</p>
                    </div>
                  ) : null}

                  {entry.throws?.length ? (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Throws
                      </h4>
                      <ul className="space-y-2">
                        {entry.throws.map((item) => (
                          <li
                            key={`${entry.name}-throw-${item}`}
                            className="text-sm text-slate-300"
                          >
                            - {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {entry.notes?.length ? (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Notes
                      </h4>
                      <ul className="space-y-2">
                        {entry.notes.map((item) => (
                          <li key={`${entry.name}-note-${item}`} className="text-sm text-slate-300">
                            - {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          </section>

          {page.sdkGuide.codeExamples?.length ? (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="w-1.5 h-6 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                SDK Code Examples
              </h2>
              <div className="space-y-5">
                {page.sdkGuide.codeExamples.map((example) => (
                  <div
                    key={`${path}-example-${example.title}`}
                    className="rounded-2xl border border-white/10 bg-[#0b0f15] p-5 space-y-3"
                  >
                    <div>
                      <h3 className="text-base font-semibold text-white">{example.title}</h3>
                      <p className="text-sm text-slate-300 mt-1">{example.description}</p>
                    </div>
                    <DocsCodeBlock code={example.code} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {page.sdkGuide.bestPractices?.length ? (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="w-1.5 h-6 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                Best Practices
              </h2>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <ul className="space-y-3">
                  {page.sdkGuide.bestPractices.map((item) => (
                    <li
                      key={`${path}-best-practice-${item}`}
                      className="text-sm text-slate-300 leading-relaxed"
                    >
                      - {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

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
