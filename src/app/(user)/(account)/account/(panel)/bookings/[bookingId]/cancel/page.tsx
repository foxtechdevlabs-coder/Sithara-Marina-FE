import type { Metadata } from "next";

import { CancelBooking } from "@/features/user/cancellations/components/cancel-booking";

export const metadata: Metadata = { title: "Request a cancellation" };

export default async function CancelBookingPage({
  params,
}: PageProps<"/account/bookings/[bookingId]/cancel">) {
  const { bookingId } = await params;

  return <CancelBooking bookingId={bookingId} />;
}
