import type { Metadata } from "next";

import { BookingList } from "@/features/admin/bookings/components/booking-list";

export const metadata: Metadata = { title: "Bookings" };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const q = await searchParams;
  const customer = one(q.customer);
  return (
    <BookingList
      key={customer}
      customer={customer ? { id: customer, name: one(q.name) } : undefined}
    />
  );
}
