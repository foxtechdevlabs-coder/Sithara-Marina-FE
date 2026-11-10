import type { Metadata } from "next";

import { BookingReschedule } from "@/features/admin/bookings/components/booking-reschedule";

export const metadata: Metadata = { title: "Reschedule booking" };

export default async function BookingReschedulePage({
  params,
}: PageProps<"/admin/bookings/[bookingId]/reschedule">) {
  const { bookingId } = await params;
  return <BookingReschedule key={bookingId} bookingId={bookingId} />;
}
