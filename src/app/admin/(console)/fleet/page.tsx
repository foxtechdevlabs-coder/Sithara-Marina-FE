import type { Metadata } from "next";

import YachtManagement from "@/components/admin/Yeachtmanagement";

export const metadata: Metadata = { title: "Yachts" };

export default function FleetPage() {
  return <YachtManagement />;
}
