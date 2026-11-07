import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { YachtAvailability } from "@/features/user/availability/components/yacht-availability";
import { formatMinorUnits, todayIn } from "@/features/user/yachts/utils/yacht-view";
import { isApiError } from "@/services/http/api-error";
import { getYacht } from "@/services/user/yachts.service";

export const metadata: Metadata = { title: "Check availability" };

/** Only picks the first month shown; each API answer carries its own timezone. */
const FIRST_MONTH_TIMEZONE = "Asia/Kolkata";

// `yachtId` in the URL is the yacht's slug. Any other failure reaches error.tsx.
export default async function YachtAvailabilityPage({
  params,
}: PageProps<"/yachts/[yachtId]/availability">) {
  const { yachtId } = await params;
  const yacht = await getYacht(yachtId).catch((error: unknown) => {
    if (isApiError(error) && error.status === 404) notFound();
    throw error;
  });

  return (
    <YachtAvailability
      yachtId={yacht.id}
      slug={yacht.slug}
      name={yacht.name}
      capacity={yacht.capacity}
      suites={yacht.suites}
      startingPrice={formatMinorUnits(yacht.starting_price, yacht.currency)}
      departureCity={yacht.departure_city}
      slotTypes={yacht.slot_types}
      enquiryEnabled={yacht.enquiry_enabled}
      bookingMode={yacht.booking_mode}
      initialMonth={todayIn(FIRST_MONTH_TIMEZONE).slice(0, 7)}
    />
  );
}
