import { cn } from "@/lib/utils";

type LogoProps = {
  tone?: "brand" | "muted";
  wordmark?: boolean;
  wordmarkClassName?: string;
  iconClassName?: string;
};

export function Logo({
  tone = "brand",
  wordmark = true,
  wordmarkClassName,
  iconClassName,
}: LogoProps) {
  return (
    <>
      <img
        src="/logo.svg"
        alt=""
        aria-hidden
        className={cn("h-5 w-5 shrink-0", tone === "muted" && "opacity-60", iconClassName)}
      />
      {wordmark ? (
        <span className={cn("font-pixel uppercase text-[var(--color-bone)]", wordmarkClassName)}>
          hostfunc
        </span>
      ) : null}
    </>
  );
}
