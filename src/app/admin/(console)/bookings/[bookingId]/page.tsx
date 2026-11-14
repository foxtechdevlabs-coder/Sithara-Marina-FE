import type { Metadata } from "next";

import { BookingDetail } from "@/features/admin/bookings/components/booking-detail";

export const metadata: Metadata = { title: "Booking details" };

export default async function BookingDetailPage({
  params,
}: PageProps<"/admin/bookings/[bookingId]">) {
  const { bookingId } = await params;
  return <BookingDetail key={bookingId} bookingId={bookingId} />;
}
