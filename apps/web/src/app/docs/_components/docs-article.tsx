import { JsonLd } from "@/components/seo/json-ld";
import { getDocsPage } from "@/lib/docs-content";
import { breadcrumbJsonLd, docsBreadcrumbs, techArticleJsonLd } from "@/lib/seo";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { DocsCodeBlock } from "./docs-code-block";

function renderInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={`inline-code-${idx}-${part}`}
          className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--color-bone)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`inline-text-${idx}-${part}`}>{part}</span>;
  });
}

export function DocsArticle({ path }: { path: string }) {
  const page = getDocsPage(path);

  return (
    <article className="docs-prose animate-in space-y-12 pb-20 fade-in duration-500">
      <JsonLd data={techArticleJsonLd({ title: page.title, description: page.summary, path })} />
      <JsonLd data={breadcrumbJsonLd(docsBreadcrumbs(path))} />
      {/* Header */}
      <header className="space-y-5">
        <h1 className="font-display text-4xl leading-[1.08] tracking-tight text-[var(--color-bone)] md:text-5xl">
          {page.title}
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-[var(--color-bone-muted)] md:text-xl">
          {renderInlineCode(page.summary)}
        </p>
      </header>

      {page.guideSections?.length ? (
        <>
          <div className="h-px w-full bg-gradient-to-r from-[var(--color-amber)]/40 via-[var(--color-amber)]/15 to-transparent" />
          <section className="space-y-6">
            <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[var(--color-bone)]">
              <div className="h-6 w-1.5 rounded-full bg-[var(--color-amber)] shadow-[0_0_8px_rgba(255,197,107,0.5)]" />
              Step-by-Step Guide
            </h2>
            <div className="space-y-8">
              {page.guideSections.map((section, idx) => (
                <section key={`${path}-guide-${section.title}`} className="space-y-3">
                  <h3 className="text-xl font-semibold text-[var(--color-bone)]">
                    <span className="mr-2 text-[var(--color-amber)]">{idx + 1}.</span>
                    {section.title.replace(/^\d+[).]?\s*/, "")}
                  </h3>
                  <p className="text-base leading-7 text-[var(--color-bone-muted)]">
                    {renderInlineCode(section.description)}
                  </p>

                  {section.bullets?.length ? (
                    <ul className="list-disc space-y-2 pl-6 text-[15px] leading-7 text-[var(--color-bone-muted)]">
                      {section.bullets.map((item) => (
                        <li key={`${section.title}-bullet-${item}`}>{renderInlineCode(item)}</li>
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
          <div className="h-px w-full bg-gradient-to-r from-[var(--color-amber)]/40 via-[var(--color-amber)]/15 to-transparent" />

          <section className="space-y-8">
            <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[var(--color-bone)]">
              <div className="h-6 w-1.5 rounded-full bg-[var(--color-amber)] shadow-[0_0_8px_rgba(255,197,107,0.5)]" />
              SDK API Reference
            </h2>

            {page.sdkGuide.quickstart ? (
              <p className="rounded-lg border-l-2 border-[var(--color-amber)]/60 bg-[var(--color-amber)]/8 px-4 py-3 text-[15px] leading-7 text-[var(--color-bone)]">
                {renderInlineCode(page.sdkGuide.quickstart)}
              </p>
            ) : null}

            <div className="grid gap-6">
              {page.sdkGuide.apiReference.map((entry) => (
                <section
                  key={`${path}-api-${entry.name}`}
                  className="space-y-5 border-b border-[var(--color-border)]/60 pb-6"
                >
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-[var(--color-bone)]">{entry.name}</h3>
                    <code className="block overflow-x-auto whitespace-pre-wrap rounded-md bg-black/30 px-3 py-2 text-xs text-[var(--color-amber)]">
                      {entry.signature}
                    </code>
                    <p className="text-[15px] leading-7 text-[var(--color-bone-muted)]">
                      {renderInlineCode(entry.description)}
                    </p>
                  </div>

                  {entry.args?.length ? (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-bone-faint)]">
                        Arguments
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-white/[0.04] text-[var(--color-bone-muted)]">
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
                                className="border-t border-[var(--color-border)]"
                              >
                                <td className="px-3 py-2 text-[var(--color-bone)]">
                                  {renderInlineCode(arg.name)}
                                </td>
                                <td className="px-3 py-2 text-[var(--color-bone-muted)]">
                                  {renderInlineCode(arg.type)}
                                </td>
                                <td className="px-3 py-2 text-[var(--color-bone-muted)]">
                                  {arg.required ? "Yes" : "No"}
                                </td>
                                <td className="px-3 py-2 text-[var(--color-bone-muted)]">
                                  {renderInlineCode(arg.description)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {entry.returns ? (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-bone-faint)]">
                        Returns
                      </h4>
                      <p className="text-sm leading-relaxed text-[var(--color-bone-muted)]">
                        {renderInlineCode(entry.returns)}
                      </p>
                    </div>
                  ) : null}

                  {entry.throws?.length ? (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-bone-faint)]">
                        Throws
                      </h4>
                      <ul className="list-disc space-y-2 pl-6">
                        {entry.throws.map((item) => (
                          <li
                            key={`${entry.name}-throw-${item}`}
                            className="text-sm text-[var(--color-bone-muted)]"
                          >
                            {renderInlineCode(item)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {entry.notes?.length ? (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-bone-faint)]">
                        Notes
                      </h4>
                      <ul className="list-disc space-y-2 pl-6">
                        {entry.notes.map((item) => (
                          <li
                            key={`${entry.name}-note-${item}`}
                            className="text-sm text-[var(--color-bone-muted)]"
                          >
                            {renderInlineCode(item)}
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
              <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[var(--color-bone)]">
                <div className="h-6 w-1.5 rounded-full bg-[var(--color-amber)] shadow-[0_0_8px_rgba(255,197,107,0.5)]" />
                SDK Code Examples
              </h2>
              <div className="space-y-5">
                {page.sdkGuide.codeExamples.map((example) => (
                  <div
                    key={`${path}-example-${example.title}`}
                    className="space-y-3 border-b border-[var(--color-border)]/60 pb-6"
                  >
                    <div>
                      <h3 className="text-base font-semibold text-[var(--color-bone)]">
                        {example.title}
                      </h3>
                      <p className="mt-1 text-[15px] leading-7 text-[var(--color-bone-muted)]">
                        {renderInlineCode(example.description)}
                      </p>
                    </div>
                    <DocsCodeBlock code={example.code} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {page.sdkGuide.bestPractices?.length ? (
            <section className="space-y-4">
              <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[var(--color-bone)]">
                <div className="h-6 w-1.5 rounded-full bg-[var(--color-amber)] shadow-[0_0_8px_rgba(255,197,107,0.5)]" />
                Best Practices
              </h2>
              <div className="rounded-lg border border-[var(--color-border)]/80 bg-[var(--color-ink-elevated)]/40 p-5">
                <ul className="list-disc space-y-3 pl-6">
                  {page.sdkGuide.bestPractices.map((item) => (
                    <li
                      key={`${path}-best-practice-${item}`}
                      className="text-sm leading-relaxed text-[var(--color-bone-muted)]"
                    >
                      {renderInlineCode(item)}
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
        <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-[var(--color-bone-faint)]">
          Related Documentation
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {page.related.map((item) => (
            <Link
              key={`${path}:${item.href}`}
              href={item.href}
              className="group flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-5 shadow-sm transition-all hover:border-[var(--color-amber)]/35 hover:bg-white/[0.04]"
            >
              <span className="font-medium text-[var(--color-bone-muted)] transition-colors group-hover:text-[var(--color-bone)]">
                {item.label}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-white/[0.04] transition-all group-hover:border-[var(--color-amber)]/30 group-hover:bg-[var(--color-amber)]/10">
                <ChevronRight className="h-4 w-4 text-[var(--color-bone-faint)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--color-amber)]" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
