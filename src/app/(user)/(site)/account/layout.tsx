import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AccountNav } from "@/components/user/account-nav";
import { MarinaFonts, SANS } from "@/components/user/marina-chrome";
import { getProfile } from "@/services/user/profile.service";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Signed-in customer area: account navigation beside the page content. */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const profile = await getProfile();

  return (
    <div className="text-midnight bg-white antialiased" style={SANS}>
      <MarinaFonts />
      <div className="border-field-line border-t">
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 pt-6 pb-20 sm:px-7 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-14 lg:px-12 lg:pt-12 lg:pb-32 xl:gap-16 xl:px-24">
          <AccountNav
            fullName={profile.fullName}
            email={profile.email}
            isEmailVerified={profile.isEmailVerified}
            className="lg:self-start"
          />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
