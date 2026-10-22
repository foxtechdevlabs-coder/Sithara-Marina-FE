import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Invoice" };

export default async function AccountBookingInvoicePage({
  params,
}: PageProps<"/account/bookings/[bookingId]/invoice">) {
  const { bookingId } = await params;

  return (
    <RoutePlaceholder
      title="Invoice"
      description={`Invoice access for a booking. Feature module: features/user/invoices. (bookingId: ${bookingId})`}
    />
  );
}
