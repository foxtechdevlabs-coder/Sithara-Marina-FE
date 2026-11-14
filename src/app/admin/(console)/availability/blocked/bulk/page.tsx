import type { Metadata } from "next";

import { BulkBlockForm } from "@/features/admin/availability/components/bulk-block-form";

export const metadata: Metadata = { title: "Block several yachts" };

export default function BulkBlockPage() {
  return <BulkBlockForm />;
}
