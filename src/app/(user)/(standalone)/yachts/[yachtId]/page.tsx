import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import YachtDetails from "@/components/user/YachtDetails";
import { todayIn, toYachtDetails } from "@/features/user/yachts/utils/yacht-view";
import { isApiError } from "@/services/http/api-error";
import { getYacht, listYachts, type YachtCard } from "@/services/user/yachts.service";

/** Only picks the first month shown; each API answer carries its own timezone. */
const FIRST_MONTH_TIMEZONE = "Asia/Kolkata";

/** Shared by the metadata and the page, so one visit fetches the yacht once. */
const loadYacht = cache((slug: string) => getYacht(slug));

export async function generateMetadata({
  params,
}: PageProps<"/yachts/[yachtId]">): Promise<Metadata> {
  const { yachtId } = await params;
  try {
    return { title: (await loadYacht(yachtId)).name };
  } catch {
    return { title: "Yacht details" };
  }
}

/** The other yachts are a nice extra: losing them must not lose the page. */
async function loadRelated(): Promise<YachtCard[]> {
  try {
    return (await listYachts({ limit: 4 })).items;
  } catch {
    return [];
  }
}

// `yachtId` in the URL is the yacht's slug. Any other failure reaches error.tsx.
export default async function YachtDetailPage({ params }: PageProps<"/yachts/[yachtId]">) {
  const { yachtId } = await params;
  const [yacht, related] = await Promise.all([
    loadYacht(yachtId).catch((error: unknown) => {
      if (isApiError(error) && error.status === 404) notFound();
      throw error;
    }),
    loadRelated(),
  ]);

  return (
    <YachtDetails
      yacht={toYachtDetails(yacht, related)}
      initialMonth={todayIn(FIRST_MONTH_TIMEZONE).slice(0, 7)}
    />
  );
}
