import { describe, expect, it } from "vitest";

import {
  EMPTY_BOOKING_SETUP,
  bookingSetupErrors,
  customHourOptions,
  draftFromSaved,
  followsRate,
  hasPricedPackage,
  isSetupChanged,
  packageHoursId,
  packagePriceId,
  packageSwitch,
  priceChanges,
  priceForHours,
  repriceForRate,
  startTimes,
  toSlotSetup,
  withSavedIds,
  type BookingSetupDraft,
  type SavedBooking,
} from "@/features/admin/fleet/utils/booking-setup";
import type { SlotSetup } from "@/services/admin/fleet.service";
import type { PriceRule } from "@/services/admin/pricing.service";

const priced = (prices: Record<number, string>): BookingSetupDraft => ({
  ...EMPTY_BOOKING_SETUP,
  packages: EMPTY_BOOKING_SETUP.packages.map((p) => ({ ...p, price: prices[p.hours] ?? "" })),
});

const saved: SlotSetup = {
  opens_at: "05:00",
  closes_at: "22:00",
  turnaround_minutes: 30,
  slot_types: [1, 2, 3].map((h) => ({
    id: `slot-${h}`,
    name: `${h}-hour`,
    duration_minutes: h * 60,
    start_times: [],
    sort_order: h,
    is_active: true,
  })),
};

describe("booking setup on the add-yacht form", () => {
  it("defaults to 5:00 AM–7:00 PM with 1, 2 and 3 hour packages and no prices", () => {
    expect(bookingSetupErrors(EMPTY_BOOKING_SETUP)).toEqual({});
    expect(EMPTY_BOOKING_SETUP.packages.map((p) => [p.hours, p.enabled, p.price])).toEqual([
      [1, true, ""],
      [2, true, ""],
      [3, true, ""],
    ]);
    expect(hasPricedPackage(EMPTY_BOOKING_SETUP)).toBe(false);
  });

  it("lists hourly start times, including the last one", () => {
    const times = startTimes(EMPTY_BOOKING_SETUP);
    expect(times).toHaveLength(14);
    expect(times[0]).toBe("05:00");
    expect(times.at(-1)).toBe("18:00"); // back by 19:00
    expect(
      startTimes({ ...EMPTY_BOOKING_SETUP, firstStart: "05:30", lastReturn: "08:00" }),
    ).toEqual(["05:30", "06:30"]);
  });

  it("has every package back by 7:00 PM", () => {
    const setup = toSlotSetup(EMPTY_BOOKING_SETUP);
    expect(setup).toMatchObject({ opens_at: "05:00", closes_at: "19:00", turnaround_minutes: 30 });
    expect(setup.slot_types.map((s) => s.start_times.at(-1))).toEqual(["18:00", "17:00", "16:00"]);
    expect(setup.slot_types.map((s) => [s.name, s.duration_minutes])).toEqual([
      ["1-hour", 60],
      ["2-hour", 120],
      ["3-hour", 180],
    ]);
  });

  it("keeps start times within 5:00 AM to 7:00 PM, in order", () => {
    expect(bookingSetupErrors({ ...EMPTY_BOOKING_SETUP, firstStart: "04:00" })).toHaveProperty([
      "booking-first-start",
    ]);
    expect(bookingSetupErrors({ ...EMPTY_BOOKING_SETUP, lastReturn: "19:30" })).toHaveProperty([
      "booking-last-return",
    ]);
    expect(
      bookingSetupErrors({ ...EMPTY_BOOKING_SETUP, firstStart: "10:00", lastReturn: "09:00" }),
    ).toHaveProperty(["booking-last-return"]);
    expect(
      bookingSetupErrors({ ...EMPTY_BOOKING_SETUP, firstStart: "17:00", lastReturn: "19:00" }),
    ).toEqual({ "booking-last-return": "The 3-hour package doesn't fit between these times." });
  });

  it("saves a switched-off package as inactive and keeps its price", () => {
    const draft = priced({ 2: "40,000", 3: "55000.50" });
    const off = {
      ...draft,
      packages: draft.packages.map((p) => (p.hours === 3 ? { ...p, enabled: false } : p)),
    };
    expect(toSlotSetup(off).slot_types.map((t) => [t.name, t.is_active])).toEqual([
      ["1-hour", true],
      ["2-hour", true],
      ["3-hour", false],
    ]);
    expect(priceChanges(off, saved, [])).toEqual([
      {
        type: "create",
        input: { slot_type_id: "slot-2", kind: "base", amount: 4_000_000 },
      },
      {
        type: "create",
        input: { slot_type_id: "slot-3", kind: "base", amount: 5_500_050 },
      },
    ]);
    expect(hasPricedPackage(draft)).toBe(true);
    const allOff = { ...draft, packages: draft.packages.map((p) => ({ ...p, enabled: false })) };
    expect(hasPricedPackage(allOff)).toBe(false);
  });

  it("leaves out a new package that is off and has no price", () => {
    const shorter = {
      ...EMPTY_BOOKING_SETUP,
      packages: EMPTY_BOOKING_SETUP.packages.map((p) => ({ ...p, enabled: p.hours === 1 })),
    };
    expect(toSlotSetup(shorter).slot_types.map((t) => t.name)).toEqual(["1-hour"]);
  });

  it("adds custom packages, shortest first, and offers only unused hours", () => {
    const custom = { key: "custom-1", hours: 5, enabled: true, price: "90000", custom: true };
    const draft = { ...EMPTY_BOOKING_SETUP, packages: [custom, ...EMPTY_BOOKING_SETUP.packages] };
    const setup = toSlotSetup(draft);
    expect(setup.slot_types.map((s) => s.duration_minutes)).toEqual([60, 120, 180, 300]);
    expect(customHourOptions(EMPTY_BOOKING_SETUP).slice(0, 2)).toEqual([4, 5]);
    expect(customHourOptions(draft)).not.toContain(5);
    expect(customHourOptions(draft, custom)).toContain(5);
    expect(
      priceChanges(
        draft,
        { ...saved, slot_types: [{ ...saved.slot_types[0]!, id: "slot-5", name: "5-hour" }] },
        [],
      ),
    ).toEqual([
      { type: "create", input: { slot_type_id: "slot-5", kind: "base", amount: 9_000_000 } },
    ]);
  });

  it("keeps long packages back by 7:00 PM", () => {
    const eight = { key: "custom-1", hours: 8, enabled: true, price: "", custom: true };
    const draft = { ...EMPTY_BOOKING_SETUP, packages: [...EMPTY_BOOKING_SETUP.packages, eight] };
    const setup = toSlotSetup(draft);
    expect(setup.closes_at).toBe("19:00");
    const times = setup.slot_types.find((s) => s.duration_minutes === 480)!.start_times;
    expect(times.at(-1)).toBe("11:00"); // 8 hours from 11:00 is 19:00
    expect(setup.slot_types[0]!.start_times.at(-1)).toBe("18:00");
    expect(bookingSetupErrors(draft)).toEqual({});

    const tooLong = {
      ...draft,
      firstStart: "12:00",
    };
    expect(bookingSetupErrors(tooLong)).toHaveProperty([packageHoursId("custom-1")]);
  });

  it("checks prices, including on switched-off packages, since those are kept", () => {
    const bad = priced({ 2: "12.345" });
    expect(bookingSetupErrors(bad)).toHaveProperty([packagePriceId("2")]);
    const off = { ...bad, packages: bad.packages.map((p) => ({ ...p, enabled: p.hours !== 2 })) };
    expect(bookingSetupErrors(off)).toHaveProperty([packagePriceId("2")]);
  });
});

describe("package prices from the hourly rate", () => {
  const rate = 1_500_000; // ₹ 15,000

  it("works out rate × hours", () => {
    expect(priceForHours(rate, 2)).toBe("30000");
    expect(priceForHours(1_500_050, 3)).toBe("45001.50");
    expect(priceForHours(rate, 1.5)).toBe("22500");
    expect(priceForHours(null, 2)).toBe("");
  });

  it("fills empty prices, and follows the rate as it changes", () => {
    const first = repriceForRate(EMPTY_BOOKING_SETUP, null, rate);
    expect(first.packages.map((p) => p.price)).toEqual(["15000", "30000", "45000"]);
    const second = repriceForRate(first, rate, 2_000_000);
    expect(second.packages.map((p) => p.price)).toEqual(["20000", "40000", "60000"]);
  });

  it("fills a saved package's missing price, but not one it already has", () => {
    const slot = saved.slot_types[1]!;
    const noPrices: SavedBooking = { setup: { ...saved, slot_types: [slot] }, rules: [] };
    const draft = draftFromSaved(noPrices, rate);
    expect(draft.packages.find((p) => p.id === slot.id)?.price).toBe("30000");
    expect(priceChanges(draft, noPrices.setup, [])).toEqual([
      { type: "create", input: { slot_type_id: slot.id, kind: "base", amount: 3_000_000 } },
    ]);
    expect(draftFromSaved(noPrices).packages.find((p) => p.id === slot.id)?.price).toBe("");
  });

  it("fills a price on switching on, and drops only a worked-out one on switching off", () => {
    const pkg = { key: "1", hours: 2, enabled: false, price: "" };
    expect(packageSwitch(pkg, true, rate)).toEqual({ enabled: true, price: "30000" });
    const on = { ...pkg, enabled: true, price: "30000" };
    expect(packageSwitch(on, false, rate)).toEqual({ enabled: false, price: "" });
    expect(packageSwitch({ ...on, price: "25000" }, false, rate).price).toBe("25000");
    expect(packageSwitch({ ...on, id: "slot" }, false, rate).price).toBe("30000");
  });

  it("doesn't price a package that is off and not saved", () => {
    const off = {
      ...EMPTY_BOOKING_SETUP,
      packages: EMPTY_BOOKING_SETUP.packages.map((p) => ({ ...p, enabled: p.hours !== 2 })),
    };
    const next = repriceForRate(off, null, rate);
    expect(next.packages.map((p) => p.price)).toEqual(["15000", "", "45000"]);
    expect(toSlotSetup(next).slot_types.map((t) => t.duration_minutes)).toEqual([60, 180]);
  });

  it("leaves a hand-set price alone", () => {
    const first = repriceForRate(EMPTY_BOOKING_SETUP, null, rate);
    const edited = {
      ...first,
      packages: first.packages.map((p) => (p.hours === 2 ? { ...p, price: "25000" } : p)),
    };
    expect(followsRate(edited.packages[1]!, rate)).toBe(false);
    expect(repriceForRate(edited, rate, 2_000_000).packages.map((p) => p.price)).toEqual([
      "20000",
      "25000",
      "60000",
    ]);
  });
});

describe("booking setup on the edit form", () => {
  const rule = (id: string, slot: string, amount: number, over: Partial<PriceRule> = {}) =>
    ({
      id,
      slot_type_id: slot,
      kind: "base",
      name: null,
      amount,
      included_guests: null,
      extra_guest_amount: null,
      starts_on: null,
      ends_on: null,
      priority: 0,
      is_active: true,
      created_at: "",
      updated_at: "",
      ...over,
    }) as PriceRule;

  // Set up on Slots & pricing: unusual times, a 90-minute "Sunset" and no 3-hour slot.
  const yacht: SavedBooking = {
    setup: {
      opens_at: "04:00",
      closes_at: "21:00",
      turnaround_minutes: 45,
      slot_types: [
        {
          id: "s-sunset",
          name: "Sunset",
          duration_minutes: 90,
          start_times: ["17:30"],
          sort_order: 0,
          is_active: true,
        },
        {
          id: "s-2",
          name: "Two hours",
          duration_minutes: 120,
          start_times: ["04:00", "10:00"],
          sort_order: 1,
          is_active: false,
        },
      ],
    },
    rules: [rule("r-2", "s-2", 4_000_000), rule("r-sunset", "s-sunset", 2_500_000)],
  };

  it("loads saved packages and prices, keeping anything unusual", () => {
    const draft = draftFromSaved(yacht);
    expect(draft).toMatchObject({ firstStart: "04:00", lastReturn: "21:00" });
    expect(draft.packages.map((p) => [p.key, p.id, p.enabled, p.price])).toEqual([
      ["1", undefined, false, ""],
      ["2", "s-2", false, "40000"],
      ["3", undefined, false, ""],
      ["s-sunset", "s-sunset", true, "25000"],
    ]);
    expect(draft.packages[3]).toMatchObject({ custom: true, name: "Sunset", hours: 1.5 });
  });

  it("sees no change when nothing was touched, so it sends nothing", () => {
    const draft = draftFromSaved(yacht);
    expect(isSetupChanged(draft, yacht)).toBe(false);
    expect(priceChanges(draft, yacht.setup, yacht.rules)).toEqual([]);
    expect(bookingSetupErrors(draft, yacht)).toEqual({});
  });

  it("toggling sends the full list with ids and untouched times", () => {
    const start = draftFromSaved(yacht);
    const draft = {
      ...start,
      packages: start.packages.map((p) => (p.id === "s-2" ? { ...p, enabled: true } : p)),
    };
    expect(isSetupChanged(draft, yacht)).toBe(true);
    expect(toSlotSetup(draft, yacht)).toEqual({
      opens_at: "04:00",
      closes_at: "21:00",
      turnaround_minutes: 45,
      slot_types: [
        {
          id: "s-sunset",
          name: "Sunset",
          duration_minutes: 90,
          start_times: ["17:30"],
          is_active: true,
        },
        {
          id: "s-2",
          name: "Two hours",
          duration_minutes: 120,
          start_times: ["04:00", "10:00"],
          is_active: true,
        },
      ],
    });
    expect(priceChanges(draft, yacht.setup, yacht.rules)).toEqual([]);
  });

  it("switching off keeps the slot and its price", () => {
    const start = draftFromSaved(yacht);
    const draft = {
      ...start,
      packages: start.packages.map((p) => ({ ...p, enabled: false })),
    };
    expect(toSlotSetup(draft, yacht).slot_types.map((t) => [t.id, t.is_active])).toEqual([
      ["s-sunset", false],
      ["s-2", false],
    ]);
    expect(priceChanges(draft, yacht.setup, yacht.rules)).toEqual([]);
  });

  it("only a removed package leaves the list", () => {
    const start = draftFromSaved(yacht);
    const draft = { ...start, packages: start.packages.filter((p) => p.id !== "s-sunset") };
    expect(toSlotSetup(draft, yacht).slot_types.map((t) => t.id)).toEqual(["s-2"]);
  });

  it("works out price changes: update, remove, and create for a new package", () => {
    const start = draftFromSaved(yacht);
    const draft = {
      ...start,
      packages: start.packages.map((p) =>
        p.id === "s-2"
          ? { ...p, price: "45000" }
          : p.id === "s-sunset"
            ? { ...p, price: "" }
            : p.key === "1"
              ? { ...p, enabled: true, price: "20000" }
              : p,
      ),
    };
    const setup = {
      ...yacht.setup,
      slot_types: [
        ...yacht.setup.slot_types,
        { ...yacht.setup.slot_types[0]!, id: "s-1", name: "1-hour", duration_minutes: 60 },
      ],
    };
    const changes = priceChanges(draft, setup, yacht.rules);
    expect(changes).toContainEqual({ type: "update", ruleId: "r-2", amount: 4_500_000 });
    expect(changes).toContainEqual({ type: "remove", ruleId: "r-sunset" });
    expect(changes).toContainEqual({
      type: "create",
      input: { slot_type_id: "s-1", kind: "base", amount: 2_000_000 },
    });
    expect(withSavedIds(draft, setup).packages[0]).toMatchObject({ id: "s-1", name: "1-hour" });
  });

  it("ignores dated base rules when reading a package's price", () => {
    const dated = rule("r-old", "s-2", 100, { starts_on: "2026-12-01", ends_on: "2026-12-05" });
    const draft = draftFromSaved({ ...yacht, rules: [dated, ...yacht.rules] });
    expect(draft.packages.find((p) => p.id === "s-2")?.price).toBe("40000");
  });

  it("rebuilds start times only when the hours change, and then checks the window", () => {
    const start = draftFromSaved(yacht);
    const draft = { ...start, firstStart: "06:00", lastReturn: "09:00" };
    expect(toSlotSetup(draft, yacht).slot_types[1]!.start_times).toEqual(["06:00", "07:00"]);
    expect(bookingSetupErrors({ ...start, lastReturn: "20:00" }, yacht)).toHaveProperty([
      "booking-last-return",
    ]);
  });

  it("doesn't save anything for a yacht with no setup until something is entered", () => {
    const empty: SavedBooking = {
      setup: { opens_at: null, closes_at: null, turnaround_minutes: 30, slot_types: [] },
      rules: [],
    };
    const draft = draftFromSaved(empty);
    expect(isSetupChanged(draft, empty)).toBe(false);
    const on = {
      ...draft,
      packages: draft.packages.map((p) => (p.key === "2" ? { ...p, enabled: true } : p)),
    };
    expect(isSetupChanged(on, empty)).toBe(true);
    expect(toSlotSetup(on, empty)).toMatchObject({ opens_at: "05:00", closes_at: "19:00" });
  });
});
