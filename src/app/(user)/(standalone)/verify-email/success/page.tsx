import type { Metadata } from "next";

import { VerifyEmailSuccessPage } from "@/features/user/auth/components/verify-email-success-page";

export const metadata: Metadata = { title: "Email verified" };

export default function VerifyEmailSuccessRoute() {
  return <VerifyEmailSuccessPage />;
}
