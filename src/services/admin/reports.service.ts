import { z } from "zod";

import { getPublicEnv } from "@/config/env";
import { ApiError } from "@/services/http/api-error";
import { buildUrl } from "@/services/http/build-url";

import { adminApiClient } from "./admin-api-client";
import { getAccessToken } from "./admin-session";

/*
 * Admin reports (backend: /admin/reports/*, needs reports:read). Every report
 * has the same frame: period, filters, the export's columns, a page of rows and
 * a summary of the whole period. Amounts are paise.
 */

export const REPORT_TYPES = [
  "bookings",
  "revenue",
  "commission",
  "payouts",
  "utilisation",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const num = z.number();
const byPartnerCommission = z.object({
  partner_id: z.string(),
  partner_name: z.string(),
  bookings: num,
  commission_amount: num,
  partner_payable: num,
});

const summarySchemas = {
  bookings: z.object({
    bookings: num,
    /** Confirmed and completed, incl. GST. */
    booked_amount: num,
    by_status: z.record(z.string(), num),
    by_ownership: z.record(z.string(), num),
    by_yacht: z.array(
      z.object({
        yacht_id: z.string(),
        yacht_name: z.string(),
        ownership: z.string(),
        bookings: num,
        /** Bookings per status. */
        by_status: z.record(z.string(), num).default({}),
      }),
    ),
  }),
  revenue: z.object({
    bookings: num,
    /** Confirmed and completed, incl. GST (provisional). */
    gross_amount: num,
    subtotal: num,
    tax_amount: num,
    collected_amount: num.nullable(),
    refunded_amount: num.nullable(),
    net_amount: num.nullable(),
    by_yacht: z.array(
      z.object({
        yacht_id: z.string(),
        yacht_name: z.string(),
        ownership: z.string(),
        bookings: num,
        gross_amount: num,
      }),
    ),
    by_month: z.array(z.object({ month: z.string(), bookings: num, gross_amount: num })),
  }),
  commission: z.object({
    bookings: num,
    /** Null when a booking has no charter amount snapshot. */
    charter_amount: num.nullable(),
    commission_amount: num,
    partner_payable: num,
    by_partner: z.array(byPartnerCommission),
  }),
  payouts: z.object({
    bookings: num,
    paid_count: num,
    unpaid_count: num,
    paid_amount: num,
    unpaid_amount: num,
    by_partner: z.array(
      z.object({
        partner_id: z.string(),
        partner_name: z.string(),
        paid_amount: num,
        unpaid_amount: num,
      }),
    ),
  }),
  utilisation: z.object({
    yachts: num,
    booked_minutes: num,
    available_minutes: num,
    /** Provisional. */
    percent: num,
  }),
} satisfies Record<ReportType, z.ZodType>;

export type ReportSummary<T extends ReportType> = z.infer<(typeof summarySchemas)[T]>;

export const reportColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  /** text, integer, money, percent, date or datetime. */
  type: z.string(),
});
export type ReportColumn = z.infer<typeof reportColumnSchema>;

const frame = {
  title: z.string(),
  period: z.object({ from: z.string(), to: z.string() }),
  timezone: z.string(),
  currency: z.string(),
  generated_at: z.string(),
  filters: z.array(z.object({ label: z.string(), value: z.string() })),
  columns: z.array(reportColumnSchema),
  total: num,
  page: num,
  limit: num,
  /** Rows are rendered from `columns`, so they're read loosely. */
  items: z.array(z.record(z.string(), z.unknown())),
};

const reportSchema = <T extends ReportType>(type: T) =>
  z.object({ ...frame, summary: summarySchemas[type] });

export type Report<T extends ReportType> = z.infer<ReturnType<typeof reportSchema<T>>>;

/** Filters every report takes. */
export interface ReportQuery {
  /** First charter date, YYYY-MM-DD. */
  from: string;
  /** Last charter date, at most 366 days after `from`. */
  to: string;
  yacht_id?: string;
  ownership?: "own" | "partner";
  /** Yachts of this partner (payouts: paid to this partner). */
  partner_id?: string;
  /** Bookings report only. */
  status?: string;
  /** Bookings report only. */
  source?: "online" | "office";
  /** Payouts report only. */
  payout_status?: "paid" | "unpaid";
  page?: number;
  /** 1–100 (default 20). */
  limit?: number;
}

/** The filters a report accepts; any other one is a 400. */
export const REPORT_FILTERS: Record<ReportType, (keyof ReportQuery)[]> = {
  bookings: ["yacht_id", "ownership", "partner_id", "status", "source"],
  revenue: ["yacht_id", "ownership", "partner_id"],
  commission: ["yacht_id", "ownership", "partner_id"],
  payouts: ["yacht_id", "ownership", "partner_id", "payout_status"],
  utilisation: ["yacht_id", "ownership", "partner_id"],
};

/** The query without empty values and filters this report doesn't take. */
function cleanQuery(type: ReportType, query: ReportQuery) {
  const allowed = new Set<string>(["from", "to", "page", "limit", ...REPORT_FILTERS[type]]);
  return Object.fromEntries(
    Object.entries(query).filter(([k, v]) => allowed.has(k) && v !== undefined && v !== ""),
  ) as Record<string, string | number>;
}

/** GET /admin/reports/{type} */
export function getReport<T extends ReportType>(
  type: T,
  query: ReportQuery,
  signal?: AbortSignal,
): Promise<Report<T>> {
  return adminApiClient.get(`/admin/reports/${type}`, {
    query: cleanQuery(type, query),
    schema: reportSchema(type),
    signal,
  }) as Promise<Report<T>>;
}

/**
 * GET /admin/reports/{type}/export — the whole period (no paging) as a file.
 * 400 REPORT_TOO_LARGE above 20,000 rows.
 */
export async function downloadReport(
  type: ReportType,
  query: ReportQuery,
  format: "csv" | "xlsx",
  signal?: AbortSignal,
): Promise<Blob> {
  const { page: _page, limit: _limit, ...rest } = query;
  void _page;
  void _limit;
  const url = buildUrl(getPublicEnv().NEXT_PUBLIC_API_URL, `/admin/reports/${type}/export`, {
    ...cleanQuery(type, rest),
    format,
  });
  const token = await getAccessToken();
  let response: Response;
  try {
    response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new ApiError("Network error while exporting a report", { kind: "network", cause });
  }
  if (!response.ok) {
    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* keep the text */
    }
    throw new ApiError(`Request failed: export (${response.status})`, {
      kind: "http",
      status: response.status,
      body,
      headers: response.headers,
    });
  }
  return response.blob();
}

/** Saves a blob as a file in the browser. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
