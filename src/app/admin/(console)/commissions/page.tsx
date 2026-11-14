import type { Metadata } from "next";

import { CommissionOverview } from "@/features/admin/commissions/components/commission-overview";

export const metadata: Metadata = { title: "Commissions" };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function CommissionsPage({ searchParams }: PageProps<"/admin/commissions">) {
  const q = await searchParams;
  return <CommissionOverview initialPartner={one(q.partner)} />;
}
