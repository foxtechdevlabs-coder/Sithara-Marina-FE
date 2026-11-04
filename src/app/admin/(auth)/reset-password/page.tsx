import type { Metadata } from "next";

import { StaffResetPassword } from "@/features/admin/auth/components/staff-reset-password";

export const metadata: Metadata = { title: "Reset password" };

export default function StaffResetPasswordPage() {
  return <StaffResetPassword />;
}
