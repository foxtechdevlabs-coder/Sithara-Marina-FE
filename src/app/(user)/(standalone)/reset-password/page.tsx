import type { Metadata } from "next";

import { ResetPasswordPage } from "@/features/user/auth/components/reset-password-page";

export const metadata: Metadata = { title: "Reset your password" };

export default function ResetPasswordRoute() {
  return <ResetPasswordPage />;
}
