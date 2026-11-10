"use client";

import Link from "next/link";
import { useState } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
import { Notice, OUTLINE_STYLE, PRIMARY_STYLE } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  SegmentTabs,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import { downloadReport, saveBlob, type ReportType } from "@/services/admin/reports.service";

import { periodText, reportErrorMessage } from "../utils/report-format";

const NAME: Record<ReportType, string> = {
  bookings: "booking",
  revenue: "revenue",
  commission: "commission",
  payouts: "payout",
  utilisation: "utilisation",
};

/** "November booking report" for a whole month, otherwise "Booking report". */
function reportTitle(type: ReportType, from: string, to: string): string {
  const last = new Date(
    Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)), 0),
  ).getUTCDate();
  const wholeMonth =
    from.endsWith("-01") && to === `${from.slice(0, 8)}${String(last).padStart(2, "0")}`;
  if (!wholeMonth) return `${NAME[type].charAt(0).toUpperCase()}${NAME[type].slice(1)} report`;
  const month = new Date(`${from}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });
  return `${month} ${NAME[type]} report`;
}

/**
 * Export: "Your report is being prepared." (admin Figma A37). Prepares
 * GET /admin/reports/{type}/export with the filters from the Reports page,
 * then offers the file.
 */
export function ReportExport({
  type,
  from,
  to,
  yachtId,
  partnerId,
  scope,
}: {
  type: ReportType;
  from: string;
  to: string;
  yachtId?: string;
  partnerId?: string;
  /** What the filter shows, e.g. "Astra One" or "Coastal Charters Co. (partner)". */
  scope?: string;
}) {
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const query = {
    from,
    to,
    ...(yachtId ? { yacht_id: yachtId } : {}),
    ...(partnerId ? { partner_id: partnerId } : {}),
  };
  const file = useAdminQuery(
    (signal) => downloadReport(type, query, format, signal).then((blob) => ({ format, blob })),
    `export:${type}:${JSON.stringify(query)}:${format}`,
  );
  const ready = !file.loading && !file.error && file.data?.format === format;
  const status = file.error ? "Export failed" : ready ? "Ready to download" : "Preparing export";
  const title = reportTitle(type, from, to);
  const filename = `${title.toLowerCase().replace(/\s+/g, "-")}-${from}-to-${to}.${format}`;

  return (
    <div className={pagePadding}>
      <PageHeader
        title={ready ? "Your report is ready." : "Your report is being prepared."}
        subtitle="The export includes the current filters and reporting definitions."
      />
      <p
        role="status"
        className="mt-[18px] inline-flex h-[28px] items-center px-[12px] text-[11px]"
        style={{ backgroundColor: SAND }}
      >
        {status}
      </p>

      <div className="mt-[22px] border border-[#dcdad5] bg-white px-[18px] py-[20px] lg:max-w-[880px] lg:px-[22px]">
        <h2 className="text-[22px] leading-[28px]">{title}</h2>
        <p className="mt-[8px] text-[12px] leading-[18px]" style={{ color: BODY }}>
          {periodText(from, to)} · {scope || "All yachts"}
          <br />
          Revenue, refund and status definitions included.
        </p>
        <div className="mt-[16px]">
          <SegmentTabs
            label="File type"
            value={format}
            onChange={setFormat}
            options={[
              { value: "xlsx", label: "Excel (.xlsx)" },
              { value: "csv", label: "CSV" },
            ]}
          />
        </div>
      </div>

      {Boolean(file.error) && !file.loading && (
        <Notice tone="error" className="mt-[18px] lg:max-w-[880px]">
          {reportErrorMessage(file.error)}{" "}
          <button type="button" onClick={file.reload} className="underline">
            Try again
          </button>
        </Notice>
      )}

      <div className="mt-[22px] flex flex-wrap gap-[14px]">
        <button
          type="button"
          disabled={!ready}
          onClick={() => file.data && saveBlob(file.data.blob, filename)}
          className={cx(smallPrimary, "min-w-[180px]")}
          style={PRIMARY_STYLE}
        >
          {ready ? "Download prepared report ↓" : file.error ? "Not available" : "Preparing…"}
        </button>
        <Link
          href={adminRoutes.reports}
          className={cx(smallOutline, "min-w-[150px]")}
          style={OUTLINE_STYLE}
        >
          Return to reports
        </Link>
      </div>

      <InfoPanel title="If an export fails" className="mt-[24px] lg:max-w-[880px]">
        Retry with the same filters, or choose a smaller reporting period. A failed export does not
        change the underlying records.
      </InfoPanel>
    </div>
  );
}
