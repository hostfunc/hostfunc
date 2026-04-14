import type { ReactNode } from "react";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 0 }}>
        <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
