import type { Metadata } from "next";

import { SupportList } from "@/features/admin/support/components/support-list";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return <SupportList />;
}
