import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { adminRoutes } from "@/constants/routes";
import { ReportExport } from "@/features/admin/reports/components/report-export";
import { REPORT_TYPES } from "@/services/admin/reports.service";

export const metadata: Metadata = { title: "Export report" };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export default async function ReportExportPage({
  searchParams,
}: PageProps<"/admin/reports/export">) {
  const q = await searchParams;
  const type = REPORT_TYPES.find((t) => t === one(q.type));
  const from = one(q.from);
  const to = one(q.to);
  if (!type || !isDate(from) || !isDate(to) || to < from) redirect(adminRoutes.reports);
  return (
    <ReportExport
      type={type}
      from={from}
      to={to}
      yachtId={one(q.yacht) || undefined}
      partnerId={one(q.partner) || undefined}
      scope={one(q.scope) || undefined}
    />
  );
}
