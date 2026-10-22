import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Partners" };

export default function PartnersPage() {
  return (
    <RoutePlaceholder
      title="Partners"
      description="Yacht-owner partner management. Feature module: features/admin/partners."
    />
  );
}
