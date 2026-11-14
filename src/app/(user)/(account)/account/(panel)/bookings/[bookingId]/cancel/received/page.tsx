import type { Metadata } from "next";

import { CancellationReceived } from "@/features/user/cancellations/components/cancellation-received";

export const metadata: Metadata = { title: "Cancellation request received" };

export default async function CancellationReceivedPage({
  params,
}: PageProps<"/account/bookings/[bookingId]/cancel/received">) {
  const { bookingId } = await params;

  return <CancellationReceived bookingRef={bookingId} />;
}
