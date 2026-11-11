import type { Metadata } from "next";
import type { ReactNode } from "react";

import { RequireCustomer } from "@/features/user/profile/components/account-ui";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Signed-in customer pages. Signed out, they offer sign-in instead of their content. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <RequireCustomer>{children}</RequireCustomer>;
}
