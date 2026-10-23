import type { ReactNode } from "react";

/**
 * Full-bleed pages that ship their own header and footer (e.g. yacht details),
 * so they skip the shared site header/footer from the `(site)` layout.
 */
export default function StandaloneLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="flex-1">
      {children}
    </main>
  );
}
