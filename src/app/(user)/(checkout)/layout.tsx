import type { ReactNode } from "react";

import { MarinaFonts, MarinaFooter, SANS } from "@/components/user/marina-chrome";
import { SiteHeader } from "@/components/user/site-header";

/** Checkout uses the same header, footer and fonts as the rest of the customer site. */
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <div className="antialiased" style={SANS}>
        <MarinaFonts />
        <MarinaFooter />
      </div>
    </>
  );
}
