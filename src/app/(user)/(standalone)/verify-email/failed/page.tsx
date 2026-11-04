import type { Metadata } from "next";

import { VerifyEmailFailedPage } from "@/features/user/auth/components/verify-email-failed-page";

export const metadata: Metadata = { title: "We couldn’t send your email" };

export default function VerifyEmailFailedRoute() {
  return <VerifyEmailFailedPage />;
}
