import type { Metadata } from "next";

import { ForgotPasswordPage } from "@/features/user/auth/components/forgot-password-page";

export const metadata: Metadata = { title: "Forgot your password" };

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}
