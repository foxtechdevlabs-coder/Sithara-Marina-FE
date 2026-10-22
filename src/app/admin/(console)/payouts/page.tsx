import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payouts" };

export default function PayoutsPage() {
  return (
    <RoutePlaceholder
      title="Payouts"
      description="Partner payout management. Feature module: features/admin/payouts."
    />
  );
}
