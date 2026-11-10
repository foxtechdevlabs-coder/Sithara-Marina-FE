import type { Metadata } from "next";

import { BookingPayment } from "@/features/admin/bookings/components/booking-payment";

export const metadata: Metadata = { title: "Booking payment" };

export default async function BookingPaymentPage({
  params,
  searchParams,
}: PageProps<"/admin/bookings/[bookingId]/payment">) {
  const { bookingId } = await params;
  const { mode } = await searchParams;
  return (
    <BookingPayment
      key={bookingId}
      bookingId={bookingId}
      mode={mode === "link" ? "link" : "offline"}
    />
  );
}
