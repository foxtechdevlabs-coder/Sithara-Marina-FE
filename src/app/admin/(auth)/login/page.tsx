import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff sign-in" };

export default function AdminLoginPage() {
  return (
    <RoutePlaceholder
      title="Staff sign-in"
      description="Staff authentication. Feature module: features/admin/auth."
    />
  );
}
