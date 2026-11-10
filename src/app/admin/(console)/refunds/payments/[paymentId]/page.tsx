import type { Metadata } from "next";

import { PaymentDetail } from "@/features/admin/refunds/components/payment-detail";

export const metadata: Metadata = { title: "Payment" };

export default async function PaymentPage({
  params,
  searchParams,
}: PageProps<"/admin/refunds/payments/[paymentId]">) {
  const { paymentId } = await params;
  const q = await searchParams;
  return (
    <PaymentDetail
      key={paymentId}
      paymentId={paymentId}
      notice={typeof q.notice === "string" ? q.notice : undefined}
    />
  );
}
