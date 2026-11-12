import type { Metadata } from "next";

import PlanCharter, { type PlanCharterYacht } from "@/components/user/PlanCharter";
import { getYacht, listYachts, type YachtCard, type YachtDetail } from "@/services/user/yachts.service";

export const metadata: Metadata = {
  title: "Plan Your Charter — Bespoke Yacht Journeys",
  description:
    "Design your custom private yacht itinerary with Sithara Marina. Tell our concierge your preferred dates, guest count, and dream destinations in Kerala or Lakshadweep.",
  alternates: {
    canonical: "/plan-your-charter",
  },
  openGraph: {
    title: "Plan Your Charter — Bespoke Yacht Journeys | Sithara Marina",
    description:
      "Design your custom private yacht itinerary with Sithara Marina. Tell our concierge your preferred dates, guest count, and dream destinations in Kerala or Lakshadweep.",
    url: "/plan-your-charter",
    images: [
      {
        url: "/images/yachts/astra-one-arabian-sea.png",
        width: 1200,
        height: 630,
        alt: "Plan your private yacht charter with Sithara Marina",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Plan Your Charter — Bespoke Yacht Journeys | Sithara Marina",
    description:
      "Design your custom private yacht itinerary with Sithara Marina. Tell our concierge your preferred dates, guest count, and dream destinations in Kerala or Lakshadweep.",
    images: ["/images/yachts/astra-one-arabian-sea.png"],
  },
};

const toChoice = (yacht: YachtCard | YachtDetail, imageUrl: string | null): PlanCharterYacht => ({
  id: yacht.id,
  capacity: yacht.capacity,
  slug: yacht.slug,
  name: yacht.name,
  imageUrl,
  instant: yacht.booking_mode === "instant",
});

/** The yacht choices are a nice extra: losing them must not lose the enquiry form. */
async function loadYachts(): Promise<PlanCharterYacht[]> {
  try {
    const { items } = await listYachts({ limit: 100 });
    return items.map((yacht) => toChoice(yacht, yacht.primary_image_url));
  } catch {
    return [];
  }
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * The yacht a customer came from: `?yacht=<slug>&yacht_id=<id>`. Matched by both
 * when both are given, so a stale or edited link cannot pick a different yacht.
 * A yacht missing from the listing (or a failed listing) is asked for directly.
 */
async function findRequested(
  yachts: PlanCharterYacht[],
  slug: string | undefined,
  yachtId: string | undefined,
): Promise<{ yachts: PlanCharterYacht[]; slug: string | null; missing: boolean }> {
  if (!slug && !yachtId) return { yachts, slug: null, missing: false };
  const match = yachts.find(
    (item) => (!yachtId || item.id === yachtId) && (!slug || item.slug === slug),
  );
  if (match) return { yachts, slug: match.slug, missing: false };
  if (slug) {
    const detail = await getYacht(slug).catch(() => null);
    if (detail && (!yachtId || detail.id === yachtId)) {
      const photo = [...detail.photos].sort((a, b) => a.sort_order - b.sort_order)[0];
      return {
        yachts: [...yachts, toChoice(detail, photo?.url ?? null)],
        slug: detail.slug,
        missing: false,
      };
    }
  }
  return { yachts, slug: null, missing: true };
}

// `?yacht=<slug>&yacht_id=<id>` preselects the yacht the customer came from;
// `&guests=<n>` (from the yacht page) starts the guest count there.
export default async function PlanCharterPage({ searchParams }: PageProps<"/plan-your-charter">) {
  const params = await searchParams;
  const requested = await findRequested(await loadYachts(), one(params.yacht), one(params.yacht_id));
  const guests = /^\d{1,3}$/.test(one(params.guests) ?? "") ? Number(one(params.guests)) : 0;

  return (
    <PlanCharter
      yachts={requested.yachts}
      initialYachtSlug={requested.slug}
      requestedYachtMissing={requested.missing}
      initialGuests={guests >= 1 ? guests : undefined}
    />
  );
}
