import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Refunds" };

export default function RefundsPage() {
  return (
    <RoutePlaceholder
      title="Refunds"
      description="Refund management. Feature module: features/admin/refunds."
    />
  );
}
