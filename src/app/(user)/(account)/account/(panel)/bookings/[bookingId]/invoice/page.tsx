import type { Metadata } from "next";

import { BookingInvoice } from "@/features/user/invoices/components/booking-invoice";

export const metadata: Metadata = { title: "Booking invoice" };

export default async function BookingInvoicePage({
  params,
}: PageProps<"/account/bookings/[bookingId]/invoice">) {
  const { bookingId } = await params;

  return <BookingInvoice bookingId={bookingId} />;
}
