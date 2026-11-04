import type { Metadata } from "next";

import { YachtPricing } from "@/features/admin/pricing/components/yacht-pricing";

export const metadata: Metadata = { title: "Slots & pricing" };

export default async function FleetYachtPricingPage({
  params,
}: PageProps<"/admin/fleet/[yachtId]/pricing">) {
  const { yachtId } = await params;
  return <YachtPricing key={yachtId} yachtId={yachtId} />;
}
