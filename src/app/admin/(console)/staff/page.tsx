import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff" };

export default function StaffPage() {
  return (
    <RoutePlaceholder
      title="Staff"
      description="Staff accounts. Feature module: features/admin/staff."
    />
  );
}
