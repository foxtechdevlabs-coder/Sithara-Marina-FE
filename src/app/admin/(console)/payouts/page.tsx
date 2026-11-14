import type { Metadata } from "next";

import { PayoutList } from "@/features/admin/payouts/components/payout-list";

export const metadata: Metadata = { title: "Payouts" };

export default function PayoutsPage() {
  return <PayoutList />;
}
