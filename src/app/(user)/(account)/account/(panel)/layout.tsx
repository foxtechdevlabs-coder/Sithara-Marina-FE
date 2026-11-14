import type { ReactNode } from "react";

import { AccountShell } from "@/features/user/account/components/account-shell";

/** Account pages with the sidebar (all but the account menu page). */
export default function AccountPanelLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
