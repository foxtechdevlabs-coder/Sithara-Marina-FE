import type { Metadata } from "next";

import { BookingCancel } from "@/features/admin/bookings/components/booking-cancel";

export const metadata: Metadata = { title: "Cancel booking" };

export default async function BookingCancelPage({
  params,
}: PageProps<"/admin/bookings/[bookingId]/cancel">) {
  const { bookingId } = await params;
  return <BookingCancel key={bookingId} bookingId={bookingId} />;
}
