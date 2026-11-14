import type { Metadata } from "next";

import { CancellationRequests } from "@/features/admin/bookings/components/cancellation-requests";

export const metadata: Metadata = { title: "Cancellation requests" };

export default function CancellationRequestsPage() {
  return <CancellationRequests />;
}
