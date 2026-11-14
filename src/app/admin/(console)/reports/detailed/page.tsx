import type { Metadata } from "next";

import { ReportsScreen } from "@/features/admin/reports/components/reports-screen";
import { REPORT_TYPES, type ReportType } from "@/services/admin/reports.service";

export const metadata: Metadata = { title: "All reports" };

export default async function DetailedReportsPage({
  searchParams,
}: PageProps<"/admin/reports/detailed">) {
  const { type } = await searchParams;
  const initial = REPORT_TYPES.find((t) => t === type) as ReportType | undefined;
  return <ReportsScreen initialType={initial} />;
}
