import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/user/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ResetPasswordRoute() {
  return <ResetPasswordForm />;
}
