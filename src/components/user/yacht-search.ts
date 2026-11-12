/**
 * Yacht search: what the URL (query string) holds, and how it becomes a
 * GET /yachts request. Shared by the home search bar, the "Find your perfect
 * fit" page and Our yachts. Plain module, so server and client components can
 * both use it. Filter options come from GET /yachts/filters.
 */
import { formatMinorUnits } from "@/features/user/yachts/utils/yacht-view";
import type {
  ListYachtsParams,
  YachtFilterOptions,
  YachtSort,
} from "@/services/user/yachts.service";

/** GET /yachts/filters has no guest list, so the capacity choices stay here. */
export const GUEST_COUNTS = Array.from({ length: 12 }, (_, i) => i + 1);
/** No API filter: kept in the URL as a preference only. */
export const DURATIONS = ["2 hours", "4 hours", "Half day", "Full day", "Overnight", "Multi-day"];
/** No API filter: kept in the URL as a preference only. */
export const AMENITIES = [
  "Private chef",
  "Air-conditioned suites",
  "Sun deck",
  "Water toys",
  "Wi-Fi on board",
];

export const SORTS = {
  recommended: "Recommended",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "capacity-desc": "Most guests first",
  "capacity-asc": "Fewest guests first",
} as const;

export type SortKey = keyof typeof SORTS;

const API_SORTS: Record<SortKey, YachtSort | undefined> = {
  recommended: undefined, // the API's default order
  "price-asc": "price_asc",
  "price-desc": "price_desc",
  "capacity-desc": "capacity_desc",
  "capacity-asc": "capacity_asc",
};

export interface YachtFilters {
  region: string; // departure city; "" = any
  guests: number; // 0 = any
  duration: string; // "" = any
  sort: SortKey;
  type: string; // "" = any
  /** Paise, excluding GST, sent to the API unchanged. */
  minPrice: number | null;
  /** Paise, excluding GST, sent to the API unchanged. */
  maxPrice: number | null;
  amenities: string[];
  date: string; // YYYY-MM-DD; "" = none
}

export const EMPTY_FILTERS: YachtFilters = {
  region: "",
  guests: 0,
  duration: "",
  sort: "recommended",
  type: "",
  minPrice: null,
  maxPrice: null,
  amenities: [],
  date: "",
};

export const YACHTS_PER_PAGE = 20;

/* ------------------------------------------------------------------ */
/* Price bands from GET /yachts/filters                                */
/* ------------------------------------------------------------------ */

export interface PriceBand {
  min: number;
  max: number;
  label: string;
}

const PRICE_BANDS = 3;
const BAND_ROUNDING = 100_000; // ₹ 1,000, in paise

/** Up to three bands across the backend's price range; none when it has no range. */
export function priceBands(options: Pick<YachtFilterOptions, "price" | "currency">): PriceBand[] {
  const { min, max } = options.price;
  if (min === null || max === null || max <= min) return [];

  const step = (max - min) / PRICE_BANDS;
  const edges = [
    Math.floor(min / BAND_ROUNDING) * BAND_ROUNDING,
    ...Array.from(
      { length: PRICE_BANDS - 1 },
      (_, i) => Math.round((min + step * (i + 1)) / BAND_ROUNDING) * BAND_ROUNDING,
    ),
    Math.ceil(max / BAND_ROUNDING) * BAND_ROUNDING,
  ].filter((edge, index, all) => index === 0 || edge > (all[index - 1] ?? 0));

  return edges.slice(1).map((edge, index) => {
    const start = edges[index] ?? edge;
    return {
      min: start,
      max: edge,
      label: `${formatMinorUnits(start, options.currency)} – ${formatMinorUnits(edge, options.currency)}`,
    };
  });
}

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

const wholeNumber = (value: string): number | null => (/^\d+$/.test(value) ? Number(value) : null);

/** True when the URL carries at least one search parameter. */
export function hasSearchParams(source: ParamSource): boolean {
  return [
    "region",
    "guests",
    "duration",
    "sort",
    "type",
    "min_price",
    "max_price",
    "amenities",
    "date",
  ].some((key) => Boolean(read(source, key)));
}

export function parseFilters(source: ParamSource): YachtFilters {
  const date = read(source, "date");
  return {
    region: read(source, "region"),
    guests: wholeNumber(read(source, "guests")) ?? 0,
    duration: DURATIONS.includes(read(source, "duration")) ? read(source, "duration") : "",
    sort: pick(read(source, "sort"), SORTS, "recommended"),
    type: read(source, "type"),
    minPrice: wholeNumber(read(source, "min_price")),
    maxPrice: wholeNumber(read(source, "max_price")),
    amenities: read(source, "amenities")
      .split(",")
      .filter((a) => AMENITIES.includes(a)),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
  };
}

export function parsePage(source: ParamSource): number {
  return Math.max(1, wholeNumber(read(source, "page")) ?? 1);
}

/** Query string for the given filters (only the ones that are set). */
export function filtersToQuery(filters: YachtFilters): string {
  const params = new URLSearchParams();
  if (filters.region) params.set("region", filters.region);
  if (filters.guests) params.set("guests", String(filters.guests));
  if (filters.duration) params.set("duration", filters.duration);
  if (filters.sort !== "recommended") params.set("sort", filters.sort);
  if (filters.type) params.set("type", filters.type);
  if (filters.minPrice !== null) params.set("min_price", String(filters.minPrice));
  if (filters.maxPrice !== null) params.set("max_price", String(filters.maxPrice));
  if (filters.amenities.length) params.set("amenities", filters.amenities.join(","));
  if (filters.date) params.set("date", filters.date);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** The applied filters in words, for showing on the results page. */
export function describeFilters(filters: YachtFilters, currency = "INR"): string[] {
  const price = (amount: number | null) => formatMinorUnits(amount, currency);
  return [
    filters.region,
    filters.guests ? `${filters.guests}+ guests` : "",
    filters.type,
    filters.minPrice !== null && filters.maxPrice !== null
      ? `${price(filters.minPrice)} – ${price(filters.maxPrice)}`
      : filters.minPrice !== null
        ? `From ${price(filters.minPrice)}`
        : filters.maxPrice !== null
          ? `Up to ${price(filters.maxPrice)}`
          : "",
    filters.date,
    filters.sort === "recommended" ? "" : SORTS[filters.sort],
  ].filter(Boolean);
}

/** True when the search holds a preference the API cannot filter by. */
export function hasUnsupportedFilters(filters: YachtFilters): boolean {
  return Boolean(filters.duration) || filters.amenities.length > 0;
}

/** The filters the API supports. Duration and amenities have no parameter. */
export function toListParams(filters: YachtFilters): ListYachtsParams {
  return {
    ...(filters.region ? { destination: filters.region } : {}),
    ...(filters.guests ? { guests: filters.guests } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.minPrice === null ? {} : { min_price: filters.minPrice }),
    ...(filters.maxPrice === null ? {} : { max_price: filters.maxPrice }),
    ...(filters.date ? { date: filters.date } : {}),
    ...(API_SORTS[filters.sort] ? { sort: API_SORTS[filters.sort] } : {}),
  };
}
