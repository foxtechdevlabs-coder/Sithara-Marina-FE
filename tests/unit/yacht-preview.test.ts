import { describe, expect, it } from "vitest";

import { EMPTY_FILTERS, previewFromCatalogue, type YachtFilters } from "@/components/user/yacht-search";
import type { YachtCard } from "@/services/user/yachts.service";

const card = (name: string, overrides: Partial<YachtCard> = {}): YachtCard => ({
  id: `id-${name}`,
  slug: name.toLowerCase(),
  name,
  type: "Motor yacht",
  length_ft: 40,
  suites: 2,
  capacity: 10,
  departure_city: "kochi",
  card_tagline: null,
  cruising_regions: [],
  primary_image_url: null,
  starting_price: 400_000,
  currency: "INR",
  available_on_date: null,
  booking_mode: "instant",
  enquiry_enabled: false,
  ...overrides,
});

const CATALOGUE = [
  card("Coral", { departure_city: "Alleppey", capacity: 6, starting_price: 300_000 }),
  card("Astra", { type: "Superyacht", capacity: 22, starting_price: 600_000 }),
  card("Bay", { capacity: 12, starting_price: null }),
];
const names = (filters: Partial<YachtFilters>) =>
  previewFromCatalogue(CATALOGUE, { ...EMPTY_FILTERS, ...filters })?.map((y) => y.name);

describe("previewFromCatalogue (GET /yachts rules)", () => {
  it("lists every yacht by name when nothing is chosen", () => {
    expect(names({})).toEqual(["Astra", "Bay", "Coral"]);
  });

  it("matches the departure city and type exactly, ignoring case", () => {
    expect(names({ region: "KOCHI" })).toEqual(["Astra", "Bay"]);
    expect(names({ region: "koc" })).toEqual([]);
    expect(names({ type: "superyacht" })).toEqual(["Astra"]);
  });

  it("keeps yachts taking at least that many guests", () => {
    expect(names({ guests: 12 })).toEqual(["Astra", "Bay"]);
    expect(names({ guests: 23 })).toEqual([]);
  });

  it("filters on the starting price, leaving out yachts without one", () => {
    expect(names({ maxPrice: 400_000 })).toEqual(["Coral"]);
    expect(names({ minPrice: 300_000, maxPrice: 600_000 })).toEqual(["Astra", "Coral"]);
  });

  it("sorts as the backend documents, with no starting price last in both price orders", () => {
    expect(names({ sort: "price-asc" })).toEqual(["Coral", "Astra", "Bay"]);
    expect(names({ sort: "price-desc" })).toEqual(["Astra", "Coral", "Bay"]);
    expect(names({ sort: "capacity-desc" })).toEqual(["Astra", "Bay", "Coral"]);
  });

  it("gives no preview for a date: only the backend knows availability", () => {
    expect(previewFromCatalogue(CATALOGUE, { ...EMPTY_FILTERS, date: "2026-12-20" })).toBeNull();
  });
});
