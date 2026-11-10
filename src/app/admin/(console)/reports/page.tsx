import type { Metadata } from "next";

import { ReportsOverview } from "@/features/admin/reports/components/reports-overview";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return <ReportsOverview />;
}
