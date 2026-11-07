import { describe, expect, it } from "vitest";

import {
  describeFilters,
  filtersToQuery,
  hasSearchParams,
  hasUnsupportedFilters,
  parseFilters,
  parsePage,
  priceBands,
  toListParams,
} from "@/components/user/yacht-search";
import {
  feetToMetres,
  formatDay,
  formatMinorUnits,
  formatTime,
  leadingBlankDays,
  shiftMonth,
  toFleetYacht,
  todayIn,
  yachtSpecs,
} from "@/features/user/yachts/utils/yacht-view";
import type { YachtCard } from "@/services/user/yachts.service";

const card: YachtCard = {
  id: "1",
  slug: "test-yacht",
  name: "Test Yacht",
  type: null,
  length_ft: null,
  suites: null,
  capacity: 1,
  departure_city: null,
  card_tagline: null,
  cruising_regions: [],
  primary_image_url: null,
  starting_price: null,
  currency: "INR",
  available_on_date: null,
  booking_mode: "instant",
  enquiry_enabled: true,
};

describe("formatMinorUnits", () => {
  it("reads API amounts as paise", () => {
    expect(formatMinorUnits(4_500_000, "INR")).toBe("₹ 45,000");
    expect(formatMinorUnits(100, "INR")).toBe("₹ 1");
    expect(formatMinorUnits(12_345, "INR")).toBe("₹ 123.45");
    expect(formatMinorUnits(0, "INR")).toBe("₹ 0");
  });

  it("keeps a missing price missing", () => {
    expect(formatMinorUnits(null, "INR")).toBeNull();
  });
});

describe("yacht display", () => {
  it("converts feet to whole metres", () => {
    expect(feetToMetres(92)).toBe(28);
  });

  it("leaves out unknown specs and pluralises", () => {
    expect(yachtSpecs(card)).toEqual(["1 guest"]);
    expect(yachtSpecs({ length_ft: 100, capacity: 12, suites: 4 })).toEqual([
      "30 metres",
      "12 guests",
      "4 suites",
    ]);
  });

  it("converts a card's starting price and keeps a missing one null", () => {
    expect(toFleetYacht({ ...card, starting_price: 4_500_000 }).startingPrice).toBe("₹ 45,000");
    expect(toFleetYacht(card).startingPrice).toBeNull();
  });

  it("only mentions availability when a date was searched", () => {
    expect(toFleetYacht(card).availabilityNote).toBeNull();
    expect(toFleetYacht({ ...card, available_on_date: true }).availabilityNote).toBe(
      "Available on your date",
    );
    expect(toFleetYacht({ ...card, available_on_date: false }).availabilityNote).toBe(
      "Not available on your date",
    );
  });
});

describe("dates and times", () => {
  it("shows instants in the API's timezone", () => {
    expect(formatTime("2026-12-20T04:30:00.000Z", "Asia/Kolkata").toLowerCase()).toBe("10:00 am");
  });

  it("finds today in the API's timezone, not the browser's", () => {
    expect(todayIn("Asia/Kolkata", new Date("2026-12-20T20:00:00.000Z"))).toBe("2026-12-21");
  });

  it("does not shift calendar dates", () => {
    expect(formatDay("2026-12-20")).toContain("20 December 2026");
    expect(leadingBlankDays("2026-11-01")).toBe(0); // a Sunday
  });

  it("moves between months across a year end", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
  });
});

describe("price bands", () => {
  const options = (min: number | null, max: number | null) => ({
    price: { min, max },
    currency: "INR",
  });

  it("builds ascending bands that cover the backend's range, in paise", () => {
    const bands = priceBands(options(4_600_000, 6_700_000));
    expect(bands).toHaveLength(3);
    expect(bands[0]?.min).toBeLessThanOrEqual(4_600_000);
    expect(bands.at(-1)?.max).toBeGreaterThanOrEqual(6_700_000);
    for (const band of bands) expect(band.max).toBeGreaterThan(band.min);
    expect(bands[0]?.label.startsWith("₹ 46,000 – ")).toBe(true);
  });

  it("offers none without a usable range", () => {
    expect(priceBands(options(null, null))).toEqual([]);
    expect(priceBands(options(100_000, 100_000))).toEqual([]);
  });
});

describe("search URL", () => {
  it("round-trips through the query string", () => {
    const filters = parseFilters({
      region: "Kochi",
      guests: "4",
      type: "Houseboat",
      min_price: "100000",
      max_price: "200000",
      sort: "price-desc",
      date: "2030-01-15",
    });
    expect(parseFilters(new URLSearchParams(filtersToQuery(filters).slice(1)))).toEqual(filters);
  });

  it("maps to the API's parameter names and sends paise unchanged", () => {
    const filters = parseFilters({
      region: "Kochi",
      sort: "capacity-desc",
      min_price: "100000",
      duration: "Half day",
    });
    expect(toListParams(filters)).toEqual({
      destination: "Kochi",
      sort: "capacity_desc",
      min_price: 100000,
    });
  });

  it("omits the sort for the API's default order", () => {
    expect(toListParams(parseFilters({}))).toEqual({});
  });

  it("drops malformed values", () => {
    const filters = parseFilters({ guests: "many", date: "soon", min_price: "-5", sort: "size" });
    expect(toListParams(filters)).toEqual({});
  });

  it("describes applied filters, in rupees, leaving out unsupported ones", () => {
    const filters = parseFilters({
      region: "Kochi",
      guests: "4",
      min_price: "100000",
      max_price: "200000",
      sort: "price-asc",
      duration: "Half day",
      amenities: "Sun deck",
    });
    expect(describeFilters(filters)).toEqual([
      "Kochi",
      "4+ guests",
      "₹ 1,000 – ₹ 2,000",
      "Price: Low to High",
    ]);
    expect(hasUnsupportedFilters(filters)).toBe(true);
    expect(hasUnsupportedFilters(parseFilters({ region: "Kochi" }))).toBe(false);
  });

  it("treats a page alone as no search", () => {
    expect(hasSearchParams({ page: "2" })).toBe(false);
    expect(hasSearchParams({ date: "2030-01-15" })).toBe(true);
  });

  it("reads the page safely", () => {
    expect(parsePage({ page: "3" })).toBe(3);
    expect(parsePage({ page: "0" })).toBe(1);
    expect(parsePage({ page: "abc" })).toBe(1);
    expect(parsePage({})).toBe(1);
  });
});
