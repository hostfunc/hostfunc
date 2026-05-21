"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner"; // Or whatever toaster you are using

// next-themes renders an inline <script> to prevent theme flicker.
// React 19 warns about script tags inside components.
// This intercepts the false-positive warning in development.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) return;
    origError.apply(console, args);
  };

  // @react-three/fiber 9.6.1 still uses `new THREE.Clock()` internally; three
  // r183+ deprecates Clock in favor of Timer. Suppress the noise until fiber
  // migrates upstream: https://github.com/pmndrs/react-three-fiber/issues
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("THREE.Clock")) return;
    origWarn.apply(console, args);
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
