import { Providers } from "@/components/providers";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { geist, instrumentSerif, jetbrainsMono } from "./fonts";

export const metadata: Metadata = {
  title: "hostfunc — tiny composable functions",
  description: "The platform for tiny composable TypeScript functions",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning
    className={`${geist.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
