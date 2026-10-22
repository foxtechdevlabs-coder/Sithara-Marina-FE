import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Roles & permissions" };

export default function StaffRolesPage() {
  return (
    <RoutePlaceholder
      title="Roles & permissions"
      description="Staff roles and permissions. Feature module: features/admin/staff."
    />
  );
}
