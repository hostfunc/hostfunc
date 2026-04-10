"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner"; // Or whatever toaster you are using
import type { ReactNode } from "react";

// next-themes renders an inline <script> to prevent theme flicker.
// React 19 warns about script tags inside components.
// This intercepts the false-positive warning in development.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) return;
    orig.apply(console, args);
  };
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}