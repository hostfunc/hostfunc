import { cn } from "@/lib/utils";
import { Fragment } from "react";

const BRAND = /\bhostfunc\b/g;

type BrandNameProps = {
  /** Prose containing zero or more standalone "hostfunc" mentions to style. */
  text: string;
  /** Optional override for the styled wordmark span. */
  className?: string;
};

/**
 * Renders prose, styling every standalone "hostfunc" mention in the brand pixel
 * font (matching the navbar wordmark in `Logo`, minus the uppercase). Strings with
 * no brand mention render verbatim, so this is a safe no-op everywhere else.
 *
 * Apply only to prose — never to code snippets, URLs, or package names like
 * `@hostfunc/fn` or `hostfunc.io`, which should stay plain text.
 */
export function BrandName({ text, className }: BrandNameProps) {
  // Split keeps a stable order; key each segment by its running offset in `text`.
  let offset = 0;
  const segments = text.split(BRAND).map((segment) => {
    const key = `${offset}:${segment}`;
    offset += segment.length + "hostfunc".length;
    return { key, segment };
  });

  return (
    <>
      {segments.map(({ key, segment }, i) => (
        <Fragment key={key}>
          {i > 0 ? (
            <span className={cn("font-pixel text-[var(--color-bone)]", className)}>hostfunc</span>
          ) : null}
          {segment}
        </Fragment>
      ))}
    </>
  );
}
