import type { Metadata } from "next";

import { BookingDetail } from "@/features/user/customer-bookings/components/booking-detail";

export const metadata: Metadata = { title: "Your booking" };

export default async function AccountBookingPage({
  params,
}: PageProps<"/account/bookings/[bookingId]">) {
  const { bookingId } = await params;

  return <BookingDetail bookingRef={bookingId} />;
}
