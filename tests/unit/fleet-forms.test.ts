import { describe, expect, it } from "vitest";

import { parseRate } from "@/features/admin/fleet/components/commission-panel";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import {
  EMPTY_FORM,
  formFromYacht,
  toCreateInput,
  feetToMetres,
  metresToFeet,
  toPatch,
  validateYachtForm,
} from "@/features/admin/fleet/utils/yacht-form";
import {
  draftFromRule,
  formatPaise,
  rupeesToPaise,
  slotSetupProblem,
  toRuleInput,
  toRulePatch,
  validateRuleDraft,
  emptyRuleDraft,
  type SlotSetupDraft,
} from "@/features/admin/pricing/utils/pricing-form";
import type { Yacht } from "@/services/admin/fleet.service";
import type { PriceRule } from "@/services/admin/pricing.service";
import { ApiError } from "@/services/http/api-error";

const saved: Yacht = {
  id: "y-1",
  name: "Azure 52",
  slug: "azure-52",
  ownership_type: "partner",
  partner: { id: "p-1", name: "Coastal Co." },
  commission_rate: null,
  type: "Motor yacht",
  length_ft: 52,
  capacity: 12,
  suites: 2,
  description: "Teak decks.",
  departure_city: "Kochi",
  departure_points: ["Marina Mall Jetty"],
  amenities: ["Sun deck"],
  inclusions: [],
  crew: [],
  policies: null,
  booking_mode: "instant",
  enquiry_enabled: true,
  opens_at: "08:00",
  closes_at: "20:00",
  turnaround_minutes: 30,
  is_active: true,
  is_visible: false,
  is_featured: false,
  created_at: "",
  updated_at: "",
};

describe("yacht form → API", () => {
  it("creates with required fields and only the filled-in optional ones", () => {
    const input = toCreateInput({
      ...EMPTY_FORM,
      name: "  Astra Two ",
      capacity: "8",
      type: "Superyacht",
    });
    expect(input).toEqual({
      name: "Astra Two",
      ownership_type: "own",
      capacity: 8,
      type: "Superyacht",
      booking_mode: "instant",
      enquiry_enabled: false,
    });
    expect(input).not.toHaveProperty("is_visible");
    expect(input).not.toHaveProperty("partner_id");
  });

  it("sends partner_id only for partner yachts", () => {
    const input = toCreateInput({
      ...EMPTY_FORM,
      name: "M",
      capacity: "4",
      ownership: "partner",
      partnerId: "p-1",
    });
    expect(input.partner_id).toBe("p-1");
  });

  it("maps the booking options to booking_mode and enquiry_enabled", () => {
    expect(formFromYacht(saved).mode).toBe("slots");
    expect(formFromYacht({ ...saved, booking_mode: "enquiry_only" }).mode).toBe("enquiry");
    expect(formFromYacht({ ...saved, enquiry_enabled: false }).mode).toBe("instant");
  });

  it("patches only changed fields; emptied fields become null", () => {
    const form = formFromYacht(saved);
    expect(toPatch(form, saved)).toEqual({});
    expect(toPatch({ ...form, suites: "", description: "", capacity: "10" }, saved)).toEqual({
      suites: null,
      description: null,
      capacity: 10,
    });
    expect(toPatch({ ...form, mode: "enquiry" }, saved)).toEqual({ booking_mode: "enquiry_only" });
  });

  it("switching to own sends ownership_type only (the server clears the partner)", () => {
    expect(toPatch({ ...formFromYacht(saved), ownership: "own" }, saved)).toEqual({
      ownership_type: "own",
    });
  });

  it("validates like the backend", () => {
    expect(validateYachtForm(EMPTY_FORM, false)).toEqual({
      "yacht-name": expect.any(String),
      capacity: expect.any(String),
    });
    const errors = validateYachtForm(
      {
        ...EMPTY_FORM,
        name: "A",
        capacity: "1001",
        slug: "Not A Slug",
        suites: "51",
        ownership: "partner",
      },
      false,
    );
    expect(Object.keys(errors).sort()).toEqual(["capacity", "partner", "slug", "suites"]);
    expect(validateYachtForm({ ...formFromYacht(saved), slug: "" }, true)).toHaveProperty("slug");
  });
});

describe("length: metres on the form, whole feet in the API", () => {
  it("converts both ways", () => {
    expect(metresToFeet(46)).toBe(151);
    expect(feetToMetres(151)).toBe(46);
    expect(formFromYacht(saved).length).toBe("16"); // 52 ft
  });

  it("sends length_ft from metres and doesn't patch an unchanged length", () => {
    expect(toCreateInput({ ...EMPTY_FORM, name: "A", capacity: "4", length: "46" }).length_ft).toBe(
      151,
    );
    expect(toPatch(formFromYacht(saved), saved)).toEqual({});
    expect(toPatch({ ...formFromYacht(saved), length: "20" }, saved)).toEqual({ length_ft: 66 });
  });

  it("limits metres to what 1–1000 ft allows", () => {
    expect(
      validateYachtForm({ ...EMPTY_FORM, name: "A", capacity: "4", length: "305" }, false),
    ).toHaveProperty("length");
  });
});

describe("pricing form → API", () => {
  it("converts rupees and paise", () => {
    expect(rupeesToPaise("40,000")).toBe(4_000_000);
    expect(rupeesToPaise("1500.5")).toBe(150_050);
    expect(rupeesToPaise("12.345")).toBeNull();
    expect(rupeesToPaise("abc")).toBeNull();
    expect(formatPaise(4_000_000)).toBe("₹ 40,000");
    expect(formatPaise(150_050)).toBe("₹ 1,500.50");
  });

  const setup = (over: Partial<SlotSetupDraft> = {}): SlotSetupDraft => ({
    opensAt: "08:00",
    closesAt: "20:00",
    turnaround: "30",
    slotTypes: [
      {
        id: "",
        key: "k",
        name: "4-hour",
        duration: "240",
        startTimes: "09:00, 14:00",
        active: true,
      },
    ],
    ...over,
  });

  it("checks the slot setup like the backend", () => {
    expect(slotSetupProblem(setup())).toBeNull();
    expect(slotSetupProblem(setup({ closesAt: "07:00" }))).toMatch(/after the first departure/);
    expect(
      slotSetupProblem(setup({ slotTypes: [{ ...setup().slotTypes[0]!, startTimes: "17:00" }] })),
    ).toMatch(/end after the last return/);
    expect(
      slotSetupProblem(
        setup({ slotTypes: [{ ...setup().slotTypes[0]!, startTimes: "09:00, 09:00" }] }),
      ),
    ).toMatch(/twice/);
  });

  const rule: PriceRule = {
    id: "r-1",
    slot_type_id: "s-1",
    kind: "season",
    name: "Diwali week",
    amount: 4_000_000,
    included_guests: 10,
    extra_guest_amount: 150_000,
    starts_on: "2026-12-20",
    ends_on: "2027-01-05",
    priority: 0,
    is_active: true,
    created_at: "",
    updated_at: "",
  };

  it("requires dates for season rules and keeps them in order", () => {
    const draft = { ...emptyRuleDraft("s-1"), kind: "season" as const, amount: "100" };
    expect(Object.keys(validateRuleDraft(draft)).sort()).toEqual(["endsOn", "startsOn"]);
    expect(
      validateRuleDraft({ ...draft, startsOn: "2026-12-20", endsOn: "2026-12-01" }),
    ).toHaveProperty("endsOn");
  });

  it("creates with filled-in fields and patches changes, clearing with null", () => {
    expect(toRuleInput({ ...emptyRuleDraft("s-1"), amount: "40000" })).toEqual({
      slot_type_id: "s-1",
      kind: "base",
      amount: 4_000_000,
      priority: 0,
      is_active: true,
    });
    const draft = draftFromRule(rule);
    expect(toRulePatch(draft, rule)).toEqual({});
    expect(
      toRulePatch({ ...draft, name: "", amount: "45000", extraGuestAmount: "" }, rule),
    ).toEqual({
      name: null,
      amount: 4_500_000,
      extra_guest_amount: null,
    });
  });

  it("parses the commission rate like the backend (0–100, 2 decimals, empty removes)", () => {
    expect(parseRate("12.5")).toBe(12.5);
    expect(parseRate("")).toBeNull();
    expect(parseRate("100.01")).toBeUndefined();
    expect(parseRate("1.234")).toBeUndefined();
  });
});

describe("fleet error messages", () => {
  const http = (status: number, body: unknown) => new ApiError("x", { kind: "http", status, body });

  it("explains known codes and shows validation messages", () => {
    expect(fleetErrorMessage(http(409, { code: "SLUG_EXISTS", message: "x" }))).toMatch(/URL name/);
    expect(
      fleetErrorMessage(http(400, { message: ["capacity must not be greater than 1000"] })),
    ).toBe("Capacity must not be greater than 1000.");
    expect(fleetErrorMessage(http(403, {}))).toMatch(/permission/);
    expect(fleetErrorMessage(http(404, {}), "This price rule")).toMatch(
      /^This price rule no longer exists/,
    );
    expect(fleetErrorMessage(new ApiError("x", { kind: "network" }))).toMatch(/reach the server/);
  });
});
