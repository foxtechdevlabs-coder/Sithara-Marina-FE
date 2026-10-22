import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fleet" };

export default function FleetPage() {
  return (
    <RoutePlaceholder
      title="Fleet"
      description="All yachts, company-owned and partner-owned. Feature module: features/admin/fleet."
    />
  );
}
