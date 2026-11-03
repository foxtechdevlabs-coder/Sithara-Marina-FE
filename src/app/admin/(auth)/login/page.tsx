import type { Metadata } from "next";

import AdminLogin from "@/components/admin/adminlogin";

export const metadata: Metadata = { title: "Staff sign-in" };

export default function AdminLoginPage() {
  return <AdminLogin />;
}
