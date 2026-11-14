import type { Metadata } from "next";

import { AvailabilityCalendar } from "@/features/admin/availability/components/availability-calendar";

export const metadata: Metadata = { title: "Availability" };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function AvailabilityPage({ searchParams }: PageProps<"/admin/availability">) {
  const q = await searchParams;
  return (
    <AvailabilityCalendar
      initialYacht={one(q.yacht)}
      initialMonth={one(q.month)}
      initialDate={one(q.date)}
      notice={one(q.notice)}
    />
  );
}
