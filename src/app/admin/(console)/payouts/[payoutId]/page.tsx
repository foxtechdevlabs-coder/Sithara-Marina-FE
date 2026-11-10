import type { Metadata } from "next";

import { PayoutDetail } from "@/features/admin/payouts/components/payout-detail";

export const metadata: Metadata = { title: "Payout" };

export default async function PayoutPage({
  params,
  searchParams,
}: PageProps<"/admin/payouts/[payoutId]">) {
  const { payoutId } = await params;
  const q = await searchParams;
  return <PayoutDetail key={payoutId} payoutId={payoutId} recorded={q.recorded === "1"} />;
}
