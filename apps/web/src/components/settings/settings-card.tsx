import { cn } from "@/lib/utils";
import type * as React from "react";

interface SettingsCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SettingsCard({ className, ...props }: SettingsCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)] text-[var(--color-bone)] shadow-sm transition-all duration-200",
        className,
      )}
      {...props}
    />
  );
}

interface SettingsCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SettingsCardHeader({ className, ...props }: SettingsCardHeaderProps) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

interface SettingsCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function SettingsCardTitle({ className, ...props }: SettingsCardTitleProps) {
  return <h3 className={cn("font-semibold leading-none tracking-tight text-[var(--color-bone)]", className)} {...props} />;
}

interface SettingsCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function SettingsCardDescription({ className, ...props }: SettingsCardDescriptionProps) {
  return <p className={cn("text-sm text-[var(--color-bone-muted)]", className)} {...props} />;
}

interface SettingsCardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SettingsCardContent({ className, ...props }: SettingsCardContentProps) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

interface SettingsCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SettingsCardFooter({ className, ...props }: SettingsCardFooterProps) {
  return <div className={cn("flex items-center border-t border-[var(--color-border)] bg-white/[0.02] p-6", className)} {...props} />;
}
