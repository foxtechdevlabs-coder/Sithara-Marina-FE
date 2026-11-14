import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MarinaFonts, MarinaFooter, SANS } from "@/components/user/marina-chrome";
import { SiteHeader } from "@/components/user/site-header";
import { RequireCustomerSession } from "@/features/user/account/components/require-customer-session";

/** Private pages: never indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Customer account area: site header, the signed-in pages and the Figma
 * footer. Header and footer are left out when an invoice is printed.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main id="main" className="text-navy-ink flex-1 bg-white antialiased" style={SANS}>
        <MarinaFonts />
        <RequireCustomerSession>{children}</RequireCustomerSession>
      </main>
      <div className="antialiased print:hidden" style={SANS}>
        <MarinaFooter />
      </div>
    </>
  );
}
