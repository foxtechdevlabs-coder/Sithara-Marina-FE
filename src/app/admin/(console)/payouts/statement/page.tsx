import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { adminRoutes } from "@/constants/routes";
import { PayoutStatement } from "@/features/admin/payouts/components/payout-statement";

export const metadata: Metadata = { title: "Payout statement" };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** This month in the marina's time zone. */
function thisMonth() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [y, m] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return {
    from: `${today.slice(0, 7)}-01`,
    to: `${today.slice(0, 7)}-${String(last).padStart(2, "0")}`,
  };
}

export default async function PayoutStatementPage({
  searchParams,
}: PageProps<"/admin/payouts/statement">) {
  const q = await searchParams;
  const partner = one(q.partner);
  if (!partner) redirect(adminRoutes.payouts);
  const from = one(q.from);
  const to = one(q.to);
  const period = isDate(from) && isDate(to) && from <= to ? { from, to } : thisMonth();
  return (
    <PayoutStatement
      key={`${partner}:${period.from}:${period.to}`}
      partnerId={partner}
      from={period.from}
      to={period.to}
    />
  );
}
