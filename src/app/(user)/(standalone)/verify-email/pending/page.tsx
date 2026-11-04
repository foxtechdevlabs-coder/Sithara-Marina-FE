import type { Metadata } from "next";

import { VerifyEmailPendingPage } from "@/features/user/auth/components/verify-email-pending-page";

export const metadata: Metadata = { title: "Email verification pending" };

export default function VerifyEmailPendingRoute() {
  return <VerifyEmailPendingPage />;
}
