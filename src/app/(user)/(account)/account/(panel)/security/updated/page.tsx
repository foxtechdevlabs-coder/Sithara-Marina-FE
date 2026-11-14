import type { Metadata } from "next";

import { PasswordUpdated } from "@/features/user/profile/components/profile-confirmations";

export const metadata: Metadata = { title: "Password updated" };

export default function PasswordUpdatedPage() {
  return <PasswordUpdated />;
}
