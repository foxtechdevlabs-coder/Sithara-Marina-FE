import type { Metadata } from "next";

import { CommissionScreen } from "@/features/admin/commissions/components/commission-screen";

export const metadata: Metadata = { title: "Commission rule" };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function CommissionRulePage({
  searchParams,
}: PageProps<"/admin/commissions/new">) {
  const q = await searchParams;
  return <CommissionScreen initialPartner={one(q.partner)} initialYacht={one(q.yacht)} />;
}
