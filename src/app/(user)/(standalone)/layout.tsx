import type { ReactNode } from "react";

import { SiteHeader } from "@/components/user/site-header";

/**
 * Figma pages (yacht details, our yachts, plan your charter): the shared site
 * header in its light variant, with each page rendering its own Figma footer.
 */
export default function StandaloneLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
