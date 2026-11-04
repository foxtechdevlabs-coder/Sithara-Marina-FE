export interface DashboardPeriod {
  /** e.g. "01–30 November 2026" */
  label: string;
  /** YYYY-MM-DD */
  from: string;
  to: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The current month and the two before it, as reporting periods. */
export function recentMonths(today = new Date()): DashboardPeriod[] {
  return [0, 1, 2].map((back) => {
    const first = new Date(today.getFullYear(), today.getMonth() - back, 1);
    const year = first.getFullYear();
    const month = pad(first.getMonth() + 1);
    const last = new Date(year, first.getMonth() + 1, 0).getDate();
    const name = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return {
      label: `01–${last} ${name}`,
      from: `${year}-${month}-01`,
      to: `${year}-${month}-${pad(last)}`,
    };
  });
}

const trim = (n: number) => String(Number(n.toFixed(2)));

/** Paise to the design's short form: "₹ 1.01 Cr", "₹ 28.6L", "₹ 45,000". */
export function formatCompactRupees(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 1_00_00_000) return `₹ ${trim(rupees / 1_00_00_000)} Cr`;
  if (rupees >= 1_00_000) return `₹ ${trim(rupees / 1_00_000)}L`;
  return `₹ ${Math.round(rupees).toLocaleString("en-IN")}`;
}

/** 16.7 → "16.7%", 68 → "68%" */
export const formatPercent = (percent: number) => `${Number(percent.toFixed(1))}%`;

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  no_show: "No show",
};

export const statusLabel = (status: string) =>
  STATUS_LABEL[status] ?? status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** "12 Nov" in the marina's time zone, whatever the viewer's device is set to. */
export const formatDepartureDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

/** The "Needs attention" lines for pending payments. */
export function pendingPaymentsText(pending: { count: number; amount: number }): string {
  const noun = pending.count === 1 ? "pending payment" : "pending payments";
  return `${pending.count} ${noun} (${formatCompactRupees(pending.amount)})`;
}
