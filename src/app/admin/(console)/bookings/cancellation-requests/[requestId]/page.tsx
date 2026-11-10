import type { Metadata } from "next";

import { CancellationRequestDetail } from "@/features/admin/bookings/components/cancellation-request-detail";

export const metadata: Metadata = { title: "Cancellation request" };

export default async function CancellationRequestPage({
  params,
}: PageProps<"/admin/bookings/cancellation-requests/[requestId]">) {
  const { requestId } = await params;
  return <CancellationRequestDetail key={requestId} requestId={requestId} />;
}
