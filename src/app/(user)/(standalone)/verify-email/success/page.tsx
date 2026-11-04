import type { Metadata } from "next";

import { VerifyEmailSuccessPage } from "@/features/user/auth/components/verify-email-success-page";

export const metadata: Metadata = { title: "Check your inbox" };

export default function VerifyEmailSuccessRoute() {
  return <VerifyEmailSuccessPage />;
}
