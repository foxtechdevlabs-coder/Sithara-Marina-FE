import type { Metadata } from "next";

import { BlockList } from "@/features/admin/availability/components/block-list";

export const metadata: Metadata = { title: "Availability blocks" };

export default function AvailabilityBlockedPage() {
  return <BlockList />;
}
