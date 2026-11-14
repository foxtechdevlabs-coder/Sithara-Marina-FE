"use client";

import { useApiQuery } from "@/hooks/use-api-query";
import { getYacht } from "@/services/user/yachts.service";

export interface YachtInfo {
  imageUrl: string | null;
  departureCity: string | null;
  capacity: number;
}

async function loadYachtInfo(slug: string, signal: AbortSignal): Promise<YachtInfo> {
  const yacht = await getYacht(slug, signal);
  const photo = [...yacht.photos].sort((a, b) => a.sort_order - b.sort_order)[0];
  return {
    imageUrl: photo?.url ?? null,
    departureCity: yacht.departure_city,
    capacity: yacht.capacity,
  };
}

/**
 * Photo, departure city and capacity of a booked yacht, from the public
 * GET /yachts/{slug} (the account endpoints carry only its id, slug and name).
 * `undefined` while loading or when the yacht can't be shown (e.g. hidden
 * since): pages then simply leave these details out.
 */
export function useYachtInfo(slug: string | undefined): YachtInfo | undefined {
  const query = useApiQuery(
    (signal) => (slug ? loadYachtInfo(slug, signal) : Promise.resolve(undefined)),
    `yacht-info:${slug ?? ""}`,
  );
  return query.data;
}
