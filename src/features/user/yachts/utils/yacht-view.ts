import type { YachtCard, YachtDetail } from "@/services/user/yachts.service";

/*
 * Turns API yachts into what the screens show. Display only: API values are
 * never changed in requests. Nullable fields stay null here, and each screen
 * leaves out what is missing rather than inventing a value.
 */

export interface YachtImage {
  src: string;
  alt: string;
}

export interface YachtStat {
  value: string;
  label: string;
}

/** A yacht shown as a card. */
export interface FleetYacht {
  slug: string;
  name: string;
  /** Departure city, shown on the photo. */
  location: string | null;
  /** Cruising area shown at the right of the name. */
  area: string | null;
  image: YachtImage | null;
  specs: string[];
  description: string | null;
  /** Formatted, excluding GST; null when the backend has no starting price. */
  startingPrice: string | null;
  /** Set only when a date was searched for. */
  availabilityNote: string | null;
}

export interface YachtDetailsData {
  slug: string;
  name: string;
  region: string | null;
  intro: string | null;
  heroImage: YachtImage | null;
  stats: YachtStat[];
  about: string | null;
  features: string[];
  /** Formatted, excluding GST; null when the backend has no starting price. */
  startingPrice: string | null;
  charterDetails: { label: string; value: string }[];
  gallery: YachtImage[];
  inclusions: string[];
  departurePoints: string[];
  crew: YachtDetail["crew"];
  policies: string | null;
  enquiryEnabled: boolean;
  relatedYachts: FleetYacht[];
}

const METRES_PER_FOOT = 0.3048;

export function feetToMetres(feet: number): number {
  return Math.round(feet * METRES_PER_FOOT);
}

/** Formats an API amount in minor units (paise); `null` stays `null`. */
export function formatMinorUnits(amount: number | null, currency: string): string | null {
  if (amount === null) return null;
  const major = amount / 100;
  if (currency === "INR") {
    return `₹ ${major.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(major);
}

const count = (value: number, noun: string) => `${value} ${noun}${value === 1 ? "" : "s"}`;

/** "28 metres · 12 guests · 6 suites", leaving out what is unknown. */
export function yachtSpecs(yacht: Pick<YachtCard, "length_ft" | "capacity" | "suites">): string[] {
  return [
    ...(yacht.length_ft === null ? [] : [`${feetToMetres(yacht.length_ft)} metres`]),
    count(yacht.capacity, "guest"),
    ...(yacht.suites === null ? [] : [count(yacht.suites, "suite")]),
  ];
}

export function toFleetYacht(yacht: YachtCard): FleetYacht {
  return {
    slug: yacht.slug,
    name: yacht.name,
    location: yacht.departure_city,
    area: yacht.cruising_regions[0] ?? null,
    image: yacht.primary_image_url ? { src: yacht.primary_image_url, alt: yacht.name } : null,
    specs: yachtSpecs(yacht),
    description: yacht.card_tagline,
    startingPrice: formatMinorUnits(yacht.starting_price, yacht.currency),
    availabilityNote:
      yacht.available_on_date === null
        ? null
        : yacht.available_on_date
          ? "Available on your date"
          : "Not available on your date",
  };
}

const present = (label: string, value: string | number | null) =>
  value === null || value === "" ? [] : [{ label, value: String(value) }];

export function toYachtDetails(yacht: YachtDetail, related: YachtCard[]): YachtDetailsData {
  const photos = [...yacht.photos]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((photo, index) => ({ src: photo.url, alt: `${yacht.name}, photo ${index + 1}` }));
  const regions = yacht.cruising_regions.join(" · ");
  const hours =
    yacht.opens_at && yacht.closes_at ? `${yacht.opens_at} – ${yacht.closes_at}` : null;

  return {
    slug: yacht.slug,
    name: yacht.name,
    region: regions || yacht.departure_city,
    intro: yacht.card_tagline,
    heroImage: photos[0] ?? null,
    stats: [
      ...(yacht.length_ft === null
        ? []
        : [{ value: `${feetToMetres(yacht.length_ft)}m`, label: "Length overall" }]),
      { value: String(yacht.capacity), label: "Guests on board" },
      ...(yacht.suites === null ? [] : [{ value: String(yacht.suites), label: "Private suites" }]),
      ...(yacht.crew.length === 0
        ? []
        : [{ value: String(yacht.crew.length), label: "Dedicated crew" }]),
    ],
    about: yacht.description,
    features: yacht.amenities,
    startingPrice: formatMinorUnits(yacht.starting_price, yacht.currency),
    charterDetails: [
      ...present("Cruising region", regions),
      { label: "Your company", value: `Up to ${count(yacht.capacity, "guest")}` },
      ...present("Yacht type", yacht.type),
      ...present("Departs from", yacht.departure_city),
      ...present("Hours", hours),
      ...present("Cruising speed", yacht.cruising_speed_kmh && `${yacht.cruising_speed_kmh} km/h`),
      ...present("Built", yacht.built_year),
      ...present("Refitted", yacht.refit_year),
    ],
    gallery: photos,
    inclusions: yacht.inclusions,
    departurePoints: yacht.departure_points,
    crew: yacht.crew,
    policies: yacht.policies,
    enquiryEnabled: yacht.enquiry_enabled,
    relatedYachts: related
      .filter((item) => item.slug !== yacht.slug)
      .slice(0, 3)
      .map(toFleetYacht),
  };
}

// ── Dates and times ─────────────────────────────────────────────────────────
// Calendar dates are plain YYYY-MM-DD labels, so they are read in UTC to keep
// the day from shifting. Instants are shown in the timezone the API returned.

const utcDate = (date: string) => new Date(`${date}T00:00:00Z`);

/** Today as YYYY-MM-DD in `timezone`. */
export function todayIn(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(utcDate(date));
}

export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(utcDate(`${month}-01`));
}

/** Empty cells before the 1st in a Sunday-first week. */
export function leadingBlankDays(date: string): number {
  return utcDate(date).getUTCDay();
}

export function shiftMonth(month: string, by: number): string {
  const date = utcDate(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + by);
  return date.toISOString().slice(0, 7);
}

export function formatTime(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(instant));
}
