import type { ReactNode } from "react";

import { SiteFooter } from "@/components/user/site-footer";
import { SiteHeader } from "@/components/user/site-header";

/** Public website shell: header, page content, footer. Also wraps /account. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
