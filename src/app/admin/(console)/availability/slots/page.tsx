import type { Metadata } from "next";

import { PricingHub } from "@/features/admin/pricing/components/pricing-hub";

export const metadata: Metadata = { title: "Pricing & slots" };

export default async function PricingSlotsPage({
  searchParams,
}: PageProps<"/admin/availability/slots">) {
  const q = await searchParams;
  return <PricingHub removed={typeof q.removed === "string" ? q.removed : undefined} />;
}
