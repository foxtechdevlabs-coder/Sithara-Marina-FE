import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audit history" };

export default function AuditHistoryPage() {
  return (
    <RoutePlaceholder
      title="Audit history"
      description="Who changed what, and when. Feature module: features/admin/audit."
    />
  );
}
