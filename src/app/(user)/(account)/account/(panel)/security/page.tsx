import type { Metadata } from "next";

import { SecuritySettings } from "@/features/user/profile/components/security-settings";

export const metadata: Metadata = { title: "Security" };

export default function AccountSecurityPage() {
  return <SecuritySettings />;
}
