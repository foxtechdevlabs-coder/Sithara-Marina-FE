import type { Metadata } from "next";

import { VerifyEmailPage } from "@/features/user/auth/components/verify-email-page";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailRoute() {
  return <VerifyEmailPage />;
}
