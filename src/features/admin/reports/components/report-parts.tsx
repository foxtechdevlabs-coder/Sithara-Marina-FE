"use client";

import { useState, type ReactNode } from "react";

import { BODY, MUTED, SAND } from "@/components/admin/admin-theme";
import { Notice, OUTLINE_STYLE } from "@/components/admin/form-parts";
import { smallOutline } from "@/features/admin/bookings/components/booking-ui";
import { cx } from "@/lib/cx";
import {
  downloadReport,
  saveBlob,
  type ReportColumn,
  type ReportQuery,
  type ReportType,
} from "@/services/admin/reports.service";

import { formatCell, reportErrorMessage } from "../utils/report-format";

/** A row of figures: "Bookings 42", "Commission ₹ 1,20,000"… */
export function StatTiles({ items }: { items: { label: string; value: string; note?: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-[12px] lg:grid-cols-4 lg:gap-[16px]">
      {items.map((t) => (
        <div
          key={t.label}
          className="border border-[#e3e1dc] bg-white px-[16px] py-[16px] lg:px-[18px]"
        >
          <dt className="text-[11px]" style={{ color: BODY }}>
            {t.label}
          </dt>
          <dd className="mt-[8px] text-[20px] leading-[26px] tracking-[-0.3px] break-words lg:text-[24px] lg:leading-[30px]">
            {t.value}
          </dd>
          {t.note && (
            <dd className="mt-[4px] text-[10px] leading-[14px]" style={{ color: MUTED }}>
              {t.note}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

/** A small table, e.g. a breakdown by yacht or partner. */
export function SimpleTable({
  caption,
  head,
  rows,
  empty = "Nothing in this period.",
}: {
  caption: string;
  head: string[];
  rows: { key: string; cells: ReactNode[] }[];
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-left text-[11px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr style={{ backgroundColor: SAND }}>
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={cx("px-[12px] py-[11px] font-normal", i > 0 && "text-right")}
                style={{ color: BODY }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-[#ebe9e4]">
              {r.cells.map((c, i) => (
                <td
                  key={i}
                  className={cx("px-[12px] py-[11px]", i > 0 && "text-right tabular-nums")}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr className="border-b border-[#ebe9e4]">
              <td colSpan={head.length} className="px-[12px] py-[11px]" style={{ color: BODY }}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const RIGHT = new Set(["money", "percent", "integer"]);

/** A page of report rows, laid out by the columns the backend sends (cards on phones). */
export function ReportRows({
  caption,
  columns,
  items,
  dimmed,
}: {
  caption: string;
  columns: ReportColumn[];
  items: Record<string, unknown>[];
  dimmed?: boolean;
}) {
  if (!items.length)
    return (
      <p className="text-[12px]" style={{ color: BODY }}>
        No rows in this period.
      </p>
    );
  const [first, ...rest] = columns;
  return (
    <div className={cx(dimmed && "opacity-60")}>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left text-[11px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr style={{ backgroundColor: SAND }}>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cx(
                    "px-[10px] py-[11px] font-normal whitespace-nowrap",
                    RIGHT.has(c.type) && "text-right",
                  )}
                  style={{ color: BODY }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {items.map((row, i) => (
              <tr
                key={String(row.booking_id ?? row.yacht_id ?? i)}
                className="border-b border-[#ebe9e4]"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cx(
                      "px-[10px] py-[10px] whitespace-nowrap",
                      RIGHT.has(c.type) && "text-right tabular-nums",
                    )}
                  >
                    {formatCell(row[c.key], c.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-[12px] lg:hidden">
        {items.map((row, i) => (
          <li
            key={String(row.booking_id ?? row.yacht_id ?? i)}
            className="border border-[#dcdad5] bg-white px-[16px] py-[16px]"
          >
            {first && <p className="text-[16px]">{formatCell(row[first.key], first.type)}</p>}
            <dl className="mt-[8px] grid grid-cols-2 gap-x-[12px] gap-y-[8px] text-[12px]">
              {rest.map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="text-[10px]" style={{ color: BODY }}>
                    {c.label}
                  </dt>
                  <dd className="break-words">{formatCell(row[c.key], c.type)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Previous / next for a paged report. */
export function Pager({
  page,
  total,
  limit,
  busy,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  busy?: boolean;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="mt-[16px] flex flex-wrap items-center gap-[12px] text-[12px]">
      <button
        type="button"
        disabled={page <= 1 || busy}
        onClick={() => onPage(page - 1)}
        className={smallOutline}
        style={OUTLINE_STYLE}
      >
        Previous
      </button>
      <span style={{ color: BODY }}>
        Page {page} of {pages} · {total.toLocaleString("en-IN")} rows
      </span>
      <button
        type="button"
        disabled={page >= pages || busy}
        onClick={() => onPage(page + 1)}
        className={smallOutline}
        style={OUTLINE_STYLE}
      >
        Next
      </button>
    </div>
  );
}

/** "Export CSV" / "Export Excel" for the whole period with the current filters. */
export function ExportButtons({ type, query }: { type: ReportType; query: ReportQuery }) {
  const [busy, setBusy] = useState<"" | "csv" | "xlsx">("");
  const [error, setError] = useState("");

  async function run(format: "csv" | "xlsx") {
    setBusy(format);
    setError("");
    try {
      const blob = await downloadReport(type, query, format);
      saveBlob(blob, `${type}-report-${query.from}-to-${query.to}.${format}`);
    } catch (err) {
      setError(reportErrorMessage(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-[10px]">
        {(["csv", "xlsx"] as const).map((f) => (
          <button
            key={f}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void run(f)}
            className={cx(smallOutline, "min-w-[118px]")}
            style={OUTLINE_STYLE}
          >
            {busy === f ? "Exporting…" : f === "csv" ? "Export CSV" : "Export Excel"}
          </button>
        ))}
      </div>
      {error && (
        <Notice tone="error" className="mt-[12px]">
          {error}
        </Notice>
      )}
    </div>
  );
}
