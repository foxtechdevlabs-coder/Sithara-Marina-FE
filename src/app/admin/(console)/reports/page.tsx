import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports & analytics" };

export default function ReportsPage() {
  return (
    <RoutePlaceholder
      title="Reports & analytics"
      description="Reporting and analytics. Feature module: features/admin/reports."
    />
  );
}
