import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/*
 * Admin dashboard (backend: GET /admin/dashboard). Shapes follow the backend
 * OpenAPI document (GET /docs-json). Blocks are null when the account lacks
 * the permission: bookings:read (charters, activity, pending_payments, alerts)
 * or reports:read (revenue, utilisation).
 */

/** DashboardCharterDto */
const charterSchema = z.object({
  id: z.string(),
  reference: z.string(),
  yacht_id: z.string(),
  yacht_name: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  /** pending_payment, confirmed, completed, cancelled, refunded or no_show. */
  status: z.string(),
  guest_count: z.number(),
  contact_name: z.string(),
});
export type DashboardCharter = z.infer<typeof charterSchema>;

/** DashboardResponseDto */
const dashboardSchema = z.object({
  period: z.object({ from: z.string(), to: z.string() }),
  charters: z
    .object({
      today: z.array(charterSchema),
      /** The next 10 confirmed or pending charters after today. */
      upcoming: z.array(charterSchema),
      /** All confirmed or pending charters after today. */
      upcoming_total: z.number(),
    })
    .nullable(),
  activity: z
    .object({
      new_bookings: z.number(),
      confirmed: z.number(),
      pending: z.number(),
      cancelled: z.number(),
      completed: z.number(),
      refunded: z.number(),
      no_show: z.number(),
    })
    .nullable(),
  /** All bookings awaiting payment, whatever the period. Amount in paise, including GST. */
  pending_payments: z.object({ count: z.number(), amount: z.number() }).nullable(),
  revenue: z
    .object({
      /** Paise, including GST: confirmed and completed charters. Not yet collected money. */
      booked_amount: z.number(),
      tax_amount: z.number(),
      currency: z.string(),
    })
    .nullable(),
  utilisation: z
    .object({
      percent: z.number(),
      yachts: z.array(
        z.object({
          yacht_id: z.string(),
          yacht_name: z.string(),
          booked_minutes: z.number(),
          available_minutes: z.number(),
          percent: z.number(),
        }),
      ),
    })
    .nullable(),
  /** Only booking and block conflicts for now. */
  alerts: z
    .array(z.object({ type: z.string(), message: z.string(), booking_id: z.string() }))
    .nullable(),
});
export type Dashboard = z.infer<typeof dashboardSchema>;

/** Query of GET /admin/dashboard. Dates are YYYY-MM-DD; a period is at most 366 days. */
export interface DashboardQuery {
  from?: string;
  to?: string;
  yacht_id?: string;
  ownership?: "own" | "partner";
}

/** GET /admin/dashboard */
export function getDashboard(query: DashboardQuery = {}, signal?: AbortSignal): Promise<Dashboard> {
  return adminApiClient.get("/admin/dashboard", {
    query: { ...query },
    schema: dashboardSchema,
    signal,
  });
}

/* Revenue by day (backend: GET /admin/reports/revenue, needs reports:read) ----- */

const revenueReportSchema = z.object({
  total: z.number(),
  limit: z.number(),
  items: z.array(
    z.object({
      charter_date: z.string(),
      status: z.string(),
      total_amount: z.number(),
    }),
  ),
});

/** The statuses the backend counts as booked revenue (its `gross_amount`). */
const BOOKED = new Set(["confirmed", "completed"]);

export interface RevenueDay {
  /** Local charter date, YYYY-MM-DD. */
  date: string;
  /** Paise incl. GST. */
  amount: number;
  bookings: number;
}

/**
 * Booked revenue (incl. GST) per charter day from `from` to `to`, every day
 * included. The report has no daily totals, so this adds up its rows (100 a page).
 */
export async function getRevenueByDay(
  from: string,
  to: string,
  signal?: AbortSignal,
  /** Narrow to one yacht or one partner's yachts. */
  filter: { yacht_id?: string; partner_id?: string } = {},
): Promise<RevenueDay[]> {
  const byDate = new Map<string, RevenueDay>();
  for (let d = from; d <= to;) {
    byDate.set(d, { date: d, amount: 0, bookings: 0 });
    const next = new Date(`${d}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    d = next.toISOString().slice(0, 10);
  }
  for (let page = 1; page <= 50; page++) {
    const report = await adminApiClient.get("/admin/reports/revenue", {
      query: { from, to, ...filter, page, limit: 100 },
      schema: revenueReportSchema,
      signal,
    });
    for (const row of report.items) {
      const day = byDate.get(row.charter_date);
      if (!day || !BOOKED.has(row.status)) continue;
      day.amount += row.total_amount;
      day.bookings += 1;
    }
    if (page * report.limit >= report.total || !report.items.length) break;
  }
  return [...byDate.values()];
}
