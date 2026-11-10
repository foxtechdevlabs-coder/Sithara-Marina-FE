import type { Metadata } from "next";

import { RefundForm } from "@/features/admin/refunds/components/refund-form";

export const metadata: Metadata = { title: "Refund payment" };

export default async function RefundPaymentPage({
  params,
}: PageProps<"/admin/refunds/payments/[paymentId]/refund">) {
  const { paymentId } = await params;
  return <RefundForm key={paymentId} paymentId={paymentId} />;
}
