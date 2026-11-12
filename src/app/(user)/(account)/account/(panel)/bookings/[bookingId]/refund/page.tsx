import type { Metadata } from "next";

import { RefundStatus } from "@/features/user/cancellations/components/refund-status";

export const metadata: Metadata = { title: "Your refund" };

export default async function RefundPage({
  params,
}: PageProps<"/account/bookings/[bookingId]/refund">) {
  const { bookingId } = await params;

  return <RefundStatus bookingId={bookingId} />;
}
