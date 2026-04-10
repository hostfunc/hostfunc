import * as React from "react";
import { cn } from "@/lib/utils";

interface SettingsCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SettingsCard({ className, ...props }: SettingsCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200 overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

interface SettingsCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SettingsCardHeader({ className, ...props }: SettingsCardHeaderProps) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

interface SettingsCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function SettingsCardTitle({ className, ...props }: SettingsCardTitleProps) {
  return (
    <h3
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

interface SettingsCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function SettingsCardDescription({
  className,
  ...props
}: SettingsCardDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

interface SettingsCardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SettingsCardContent({ className, ...props }: SettingsCardContentProps) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

interface SettingsCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SettingsCardFooter({ className, ...props }: SettingsCardFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center p-6 bg-muted/50 border-t",
        className
      )}
      {...props}
    />
  );
}
