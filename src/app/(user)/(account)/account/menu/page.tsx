import type { Metadata } from "next";

import { AccountMenu } from "@/features/user/account/components/account-menu";
import { ACCOUNT_FRAME } from "@/features/user/account/components/account-shell";

export const metadata: Metadata = { title: "My account" };

export default function AccountMenuPage() {
  return (
    <div className={ACCOUNT_FRAME}>
      <AccountMenu />
    </div>
  );
}
