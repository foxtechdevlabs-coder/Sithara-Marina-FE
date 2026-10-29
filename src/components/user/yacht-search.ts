/**
 * Yacht search: filter options, URL (query string) encoding and the matching
 * rules shared by the home search bar, the "Find your perfect fit" page and
 * Our yachts. Plain module, so server and client components can both use it.
 *
 * DUMMY: options and per-yacht details below stand in for API data. Once the
 * API is ready, send these filters to it instead of calling `filterFleet`.
 */
import type { FleetYacht } from "@/components/user/OurYachts";

export const REGIONS = ["Kochi", "Kerala Backwaters", "Lakshadweep Islands", "The Malabar Coast"];
export const GUEST_COUNTS = Array.from({ length: 12 }, (_, i) => i + 1);
export const DURATIONS = ["2 hours", "4 hours", "Half day", "Full day", "Overnight", "Multi-day"];
export const SORTS = {
  recommended: "Recommended",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  size: "Largest first",
} as const;
export const YACHT_TYPES = {
  all: "All yachts",
  motor: "Motor yachts",
  houseboat: "Houseboats",
} as const;
export const PRICE_RANGES = {
  any: "Any price",
  "under-1l": "Under ₹ 1,00,000 per day",
  "1l-3l": "₹ 1,00,000 – 3,00,000 per day",
  "over-3l": "Over ₹ 3,00,000 per day",
} as const;
export const AMENITIES = [
  "Private chef",
  "Air-conditioned suites",
  "Sun deck",
  "Water toys",
  "Wi-Fi on board",
];

export type SortKey = keyof typeof SORTS;
export type YachtType = keyof typeof YACHT_TYPES;
export type PriceKey = keyof typeof PRICE_RANGES;

export interface YachtFilters {
  region: string; // "" = any
  guests: number; // 0 = any
  duration: string; // "" = any
  sort: SortKey;
  type: YachtType;
  price: PriceKey;
  amenities: string[];
}

export const EMPTY_FILTERS: YachtFilters = {
  region: "",
  guests: 0,
  duration: "",
  sort: "recommended",
  type: "all",
  price: "any",
  amenities: [],
};

/** Starting point when nothing was chosen yet (matches the design). */
export const DEFAULT_FILTERS: YachtFilters = {
  ...EMPTY_FILTERS,
  region: "Kochi",
  guests: 8,
  duration: "4 hours",
  amenities: ["Private chef", "Air-conditioned suites"],
};

/* ------------------------------------------------------------------ */
/* DUMMY per-yacht details used for filtering                          */
/* ------------------------------------------------------------------ */

interface YachtSearchInfo {
  type: Exclude<YachtType, "all"> | "sailing";
  regions: string[];
  ratePerDay: number;
  amenities: string[];
}

const SEARCH_INFO: Record<string, YachtSearchInfo> = {
  "astra-one": {
    type: "motor",
    regions: ["Kochi", "Lakshadweep Islands", "The Malabar Coast"],
    ratePerDay: 450000,
    amenities: [
      "Private chef",
      "Air-conditioned suites",
      "Sun deck",
      "Water toys",
      "Wi-Fi on board",
    ],
  },
  malabar: {
    type: "motor",
    regions: ["Kochi", "The Malabar Coast"],
    ratePerDay: 180000,
    amenities: ["Private chef", "Air-conditioned suites", "Sun deck", "Wi-Fi on board"],
  },
  neelam: {
    type: "houseboat",
    regions: ["Kochi", "Kerala Backwaters"],
    ratePerDay: 65000,
    amenities: ["Private chef", "Air-conditioned suites"],
  },
  ananta: {
    type: "sailing",
    regions: ["Kochi", "The Malabar Coast"],
    ratePerDay: 120000,
    amenities: ["Sun deck", "Water toys"],
  },
};

const PRICE_BOUNDS: Record<PriceKey, [number, number]> = {
  any: [0, Infinity],
  "under-1l": [0, 100000],
  "1l-3l": [100000, 300000],
  "over-3l": [300000, Infinity],
};

/* ------------------------------------------------------------------ */
/* Query string <-> filters                                            */
/* ------------------------------------------------------------------ */

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function read(source: ParamSource, key: string): string {
  const value = source instanceof URLSearchParams ? source.get(key) : source[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const pick = <T extends string>(value: string, allowed: Record<T, unknown>, fallback: T): T =>
  value in allowed ? (value as T) : fallback;

/** True when the URL carries at least one search parameter. */
export function hasSearchParams(source: ParamSource): boolean {
  return ["region", "guests", "duration", "sort", "type", "price", "amenities"].some((key) =>
    Boolean(read(source, key)),
  );
}

export function parseFilters(source: ParamSource): YachtFilters {
  const guests = Number.parseInt(read(source, "guests"), 10);
  return {
    region: REGIONS.includes(read(source, "region")) ? read(source, "region") : "",
    guests: GUEST_COUNTS.includes(guests) ? guests : 0,
    duration: DURATIONS.includes(read(source, "duration")) ? read(source, "duration") : "",
    sort: pick(read(source, "sort"), SORTS, "recommended"),
    type: pick(read(source, "type"), YACHT_TYPES, "all"),
    price: pick(read(source, "price"), PRICE_RANGES, "any"),
    amenities: read(source, "amenities")
      .split(",")
      .filter((a) => AMENITIES.includes(a)),
  };
}

/** Query string for the given filters (only the ones that are set). */
export function filtersToQuery(filters: YachtFilters): string {
  const params = new URLSearchParams();
  if (filters.region) params.set("region", filters.region);
  if (filters.guests) params.set("guests", String(filters.guests));
  if (filters.duration) params.set("duration", filters.duration);
  if (filters.sort !== "recommended") params.set("sort", filters.sort);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.price !== "any") params.set("price", filters.price);
  if (filters.amenities.length) params.set("amenities", filters.amenities.join(","));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

/**
 * Yachts that match the filters, in the chosen order. Duration is passed on
 * as a preference only: every yacht in the dummy fleet offers every length.
 */
export function filterFleet(fleet: FleetYacht[], filters: YachtFilters): FleetYacht[] {
  const [min, max] = PRICE_BOUNDS[filters.price];
  const matches = fleet.filter((yacht) => {
    const info = SEARCH_INFO[yacht.id];
    if (!info) return true;
    if (filters.region && !info.regions.includes(filters.region)) return false;
    if (filters.guests && yacht.guests < filters.guests) return false;
    if (filters.type !== "all" && info.type !== filters.type) return false;
    if (info.ratePerDay < min || info.ratePerDay >= max) return false;
    return filters.amenities.every((a) => info.amenities.includes(a));
  });

  const rate = (y: FleetYacht) => SEARCH_INFO[y.id]?.ratePerDay ?? 0;
  if (filters.sort === "price-asc") matches.sort((a, b) => rate(a) - rate(b));
  if (filters.sort === "price-desc") matches.sort((a, b) => rate(b) - rate(a));
  if (filters.sort === "size") matches.sort((a, b) => b.lengthMetres - a.lengthMetres);
  return matches;
}
