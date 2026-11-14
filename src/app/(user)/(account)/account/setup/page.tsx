import type { Metadata } from "next";

import { AccountSetup } from "@/features/user/account/components/account-setup";
import { ACCOUNT_FRAME } from "@/features/user/account/components/account-shell";

export const metadata: Metadata = { title: "Set up your account" };

/** First-time setup: outside the (panel) layout, so without the account sidebar. */
export default function AccountSetupPage() {
  return (
    <div className={ACCOUNT_FRAME}>
      <AccountSetup />
    </div>
  );
}
