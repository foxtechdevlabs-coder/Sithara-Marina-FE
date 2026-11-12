import type { Metadata } from "next";

import { CancellationRequests } from "@/features/user/cancellations/components/cancellation-requests";

export const metadata: Metadata = { title: "Cancellation requests" };

export default function AccountCancellationsPage() {
  return <CancellationRequests />;
}
