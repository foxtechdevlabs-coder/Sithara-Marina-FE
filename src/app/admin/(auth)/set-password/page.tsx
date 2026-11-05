import type { Metadata } from "next";

import { StaffResetPassword } from "@/features/admin/auth/components/staff-reset-password";

export const metadata: Metadata = { title: "Set your password" };

/** Opened from the staff invitation email: `/admin/set-password#token=…`. */
export default function StaffSetPasswordPage() {
  return <StaffResetPassword purpose="invite" />;
}
