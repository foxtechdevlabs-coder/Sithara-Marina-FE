import type { Metadata } from "next";

import { CancellationOutcome } from "@/features/user/cancellations/components/cancellation-outcome";

export const metadata: Metadata = { title: "Cancellation" };

export default async function CancellationConfirmedPage({
  params,
}: PageProps<"/account/bookings/[bookingId]/cancel/confirmed">) {
  const { bookingId } = await params;

  return <CancellationOutcome bookingRef={bookingId} />;
}
