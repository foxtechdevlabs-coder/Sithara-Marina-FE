import type { Metadata } from "next";

import PlanCharter, { type PlanCharterYacht } from "@/components/user/PlanCharter";
import { listYachts } from "@/services/user/yachts.service";

export const metadata: Metadata = { title: "Plan your charter" };

/** The yacht choices are a nice extra: losing them must not lose the enquiry form. */
async function loadYachts(): Promise<PlanCharterYacht[]> {
  try {
    const { items } = await listYachts({ limit: 100 });
    return items.map((yacht) => ({
      slug: yacht.slug,
      name: yacht.name,
      imageUrl: yacht.primary_image_url,
      instant: yacht.booking_mode === "instant",
    }));
  } catch {
    return [];
  }
}

// `?yacht=<slug>` preselects the yacht the customer came from.
export default async function PlanCharterPage({ searchParams }: PageProps<"/plan-your-charter">) {
  const { yacht } = await searchParams;
  const yachts = await loadYachts();
  const initialYachtSlug = yachts.find((item) => item.slug === yacht)?.slug ?? null;

  return <PlanCharter yachts={yachts} initialYachtSlug={initialYachtSlug} />;
}
