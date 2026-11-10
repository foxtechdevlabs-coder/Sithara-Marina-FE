import type { Metadata } from "next";

import { PriceBatch } from "@/features/admin/pricing/components/price-batch";

export const metadata: Metadata = { title: "Bulk price rule" };

export default async function PriceBatchPage({
  params,
  searchParams,
}: PageProps<"/admin/availability/slots/batches/[batchId]">) {
  const { batchId } = await params;
  const q = await searchParams;
  return <PriceBatch key={batchId} batchId={batchId} created={q.created === "1"} />;
}
