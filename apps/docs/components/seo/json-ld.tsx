/**
 * Renders a structured-data (JSON-LD) `<script>` tag. Works in both server and
 * client components since it only emits markup — no executable JS.
 *
 * The payload is stringified and `<` is escaped to its unicode form to defang
 * any HTML-injection vector, per the Next.js JSON-LD guidance.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is escaped structured data, not user HTML
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
