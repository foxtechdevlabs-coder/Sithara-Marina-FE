import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { isApiError } from "@/services/http/api-error";
import type { ReportType } from "@/services/admin/reports.service";

/* Wording, periods and cell formats of the report screens. */

const pad = (n: number) => String(n).padStart(2, "0");

export const REPORT_LABEL: Record<ReportType, string> = {
  bookings: "Bookings",
  revenue: "Revenue",
  commission: "Commission",
  payouts: "Payouts",
  utilisation: "Utilisation",
};

/** Paise → "₹ 1,31,250" (or "₹ 50.50"). */
export function rupees(paise: number): string {
  const r = paise / 100;
  return `₹ ${r.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(r) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Minutes → "126 h" or "45 min". */
export const hoursText = (minutes: number) =>
  minutes >= 60 ? `${Math.round(minutes / 60).toLocaleString("en-IN")} h` : `${minutes} min`;

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  no_show: "No show",
  own: "Own",
  partner: "Partner",
  online: "Online",
  office: "Office",
  paid: "Paid",
  unpaid: "Unpaid",
};
const titleCase = (value: string) => value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
export const valueLabel = (value: string) => STATUS_LABEL[value] ?? titleCase(value);

const shortDate = (date: string) =>
  new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/** One report cell, by the column type the backend declares. */
export function formatCell(value: unknown, type: string): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (type) {
    case "money":
      return typeof value === "number" ? rupees(value) : String(value);
    case "percent":
      return typeof value === "number" ? `${Number(value.toFixed(1))}%` : String(value);
    case "integer":
      return typeof value === "number" ? value.toLocaleString("en-IN") : String(value);
    case "date":
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
        ? shortDate(value)
        : String(value);
    case "datetime":
      return typeof value === "string"
        ? new Date(value).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Kolkata",
          })
        : String(value);
    default:
      return typeof value === "string" && STATUS_LABEL[value] ? STATUS_LABEL[value] : String(value);
  }
}

export interface Period {
  key: string;
  label: string;
  from: string;
  to: string;
}

const monthPeriod = (year: number, month: number): Omit<Period, "key"> => {
  const first = new Date(Date.UTC(year, month, 1));
  const y = first.getUTCFullYear();
  const m = first.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return {
    label: first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    from: `${y}-${pad(m + 1)}-01`,
    to: `${y}-${pad(m + 1)}-${pad(last)}`,
  };
};

/** Report periods: this month and the ones around it, the last three months and the year. */
export function periodOptions(today: string): Period[] {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 1;
  const months = [1, 0, -1, -2, -3, -4, -5].map((delta) => {
    const p = monthPeriod(y, m + delta);
    return {
      key: p.from.slice(0, 7),
      ...p,
      label: p.label,
    };
  });
  const threeBack = monthPeriod(y, m - 2);
  const current = monthPeriod(y, m);
  return [
    months[1]!,
    months[0]!,
    ...months.slice(2),
    { key: "last-3", label: "Last 3 months", from: threeBack.from, to: current.to },
    { key: "year", label: `Year ${y}`, from: `${y}-01-01`, to: `${y}-12-31` },
  ];
}

/** "01–30 November 2026" or "1 Sep 2026 – 30 Nov 2026" */
export function periodText(from: string, to: string): string {
  if (from.slice(0, 7) === to.slice(0, 7) && from.endsWith("-01")) {
    const { label, to: last } = monthPeriod(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1);
    if (last === to) return `01–${to.slice(8)} ${label}`;
  }
  return `${shortDate(from)} – ${shortDate(to)}`;
}

/** A short message for a failed report request. */
export function reportErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 403) return "Your account doesn’t have access to reports.";
    if (error.code === "REPORT_TOO_LARGE")
      return "Too many rows to export at once (over 20,000). Choose a shorter period or add filters.";
    if (error.code === "INVALID_DATE_RANGE")
      return "Check the dates: the end can’t be before the start, and a period is at most 366 days.";
  }
  return fleetErrorMessage(error, "This report");
}
