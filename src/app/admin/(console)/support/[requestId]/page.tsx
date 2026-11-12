import type { Metadata } from "next";

import { SupportDetail } from "@/features/admin/support/components/support-detail";

export const metadata: Metadata = { title: "Support request" };

export default async function SupportRequestPage({
  params,
}: PageProps<"/admin/support/[requestId]">) {
  const { requestId } = await params;
  return <SupportDetail key={requestId} requestId={requestId} />;
}
