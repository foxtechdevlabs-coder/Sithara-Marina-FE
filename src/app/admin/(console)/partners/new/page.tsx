import type { Metadata } from "next";

import { PartnerEditor } from "@/features/admin/partners/components/partner-editor";

export const metadata: Metadata = { title: "Add partner" };

export default function NewPartnerPage() {
  return <PartnerEditor />;
}
