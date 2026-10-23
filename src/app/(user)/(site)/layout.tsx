import type { ReactNode } from "react";

import { MarinaFonts, MarinaFooter, SANS } from "@/components/user/marina-chrome";
import { SiteHeader } from "@/components/user/site-header";

/** Public website shell: header, page content, and the navy Figma footer. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      {/* Same footer, font and smoothing as the standalone yacht pages. */}
      <div className="antialiased" style={SANS}>
        <MarinaFonts />
        <MarinaFooter />
      </div>
    </>
  );
}
