import type { Metadata } from "next";

import { MoneyList } from "@/features/admin/refunds/components/money-list";

export const metadata: Metadata = { title: "Payments & refunds" };

export default async function RefundsPage({ searchParams }: PageProps<"/admin/refunds">) {
  const q = await searchParams;
  const tab = q.tab === "refunds" || q.tab === "exceptions" ? q.tab : "payments";
  return <MoneyList initialTab={tab} />;
}
