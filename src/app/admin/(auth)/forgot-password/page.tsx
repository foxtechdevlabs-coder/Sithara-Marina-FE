import type { Metadata } from "next";

import { StaffForgotPassword } from "@/features/admin/auth/components/staff-forgot-password";

export const metadata: Metadata = { title: "Forgot password" };

export default function StaffForgotPasswordPage() {
  return <StaffForgotPassword />;
}
