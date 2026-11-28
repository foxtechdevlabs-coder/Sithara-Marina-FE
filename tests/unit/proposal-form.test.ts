import { describe, expect, it } from "vitest";

import {
  contextRows,
  durationText,
  enquiryErrorMessage,
  enquiryFacts,
  proposalActions,
  proposalLengthText,
} from "@/features/admin/enquiries/utils/enquiry-format";
import {
  customMinutes,
  proposalDraft,
  proposalErrors,
  proposalInput,
  proposalPatch,
  returnTime,
  type ProposalCheckContext,
} from "@/features/admin/enquiries/utils/proposal-form";
import type { EnquiryDetail, Proposal } from "@/services/admin/enquiries.service";
import { ApiError } from "@/services/http/api-error";

const enquiry = {
  id: "e-1",
  reference: "ENQ-2026-0001",
  status: "new",
  yacht: { id: "y-1", name: "Astra One", slug: "astra-one" },
  preferred_date: "2026-12-20",
  guests: 8,
  destinations: [],
  occasion: null,
  budget: null,
  preferences: null,
  message: null,
  created_at: "2026-11-01T00:00:00.000Z",
  contact: { full_name: "Ananya Rao", email: "a@example.com", phone: "+919800000000" },
  customer_id: null,
  context: {},
  assigned_to: null,
  updated_at: "2026-11-01T00:00:00.000Z",
  proposals: [],
  history: [],
} as EnquiryDetail;

const pricing = {
  currency: "INR",
  charter_amount: 12_500_000,
  addons: [],
  addons_amount: 0,
  subtotal: 12_500_000,
  tax_rate: 18,
  tax_amount: 2_250_000,
  total_amount: 14_750_000,
};
const proposal = (over: Partial<Proposal> = {}): Proposal => ({
  id: "p-1",
  enquiry_id: "e-1",
  enquiry_reference: "ENQ-2026-0001",
  version: 1,
  status: "draft",
  yacht: { id: "y-1", name: "Astra One", slug: "astra-one" },
  slot_type_id: "s-4",
  slot_type_name: "4 hours",
  duration_minutes: null,
  date: "2026-12-20",
  start_time: "16:00",
  end_time: "20:00",
  guests: 8,
  inclusions: ["Crew"],
  message: null,
  terms: null,
  pricing,
  expires_at: null,
  sent_at: null,
  decided_at: null,
  decision_comment: null,
  checkout_session_id: null,
  created_at: "2026-11-01T00:00:00.000Z",
  ...over,
});

const ctx: ProposalCheckContext = {
  today: "2026-11-27",
  now: Date.parse("2026-11-27T06:00:00Z"),
  packageFound: true,
  packagesLoading: false,
  packageCount: 2,
  canCustom: true,
};

describe("proposal form", () => {
  it("starts a new proposal from the enquiry's wishes, always as a custom length", () => {
    const d = proposalDraft(enquiry);
    expect([d.yachtId, d.date, d.guests, d.length]).toEqual(["y-1", "2026-12-20", "8", "custom"]);
  });

  it("keeps a package draft a package: saving sends no length, so the backend keeps it", () => {
    const d = proposalDraft(enquiry, proposal());
    expect([d.length, d.slotTypeId, d.hours, d.minutes]).toEqual(["package", "s-4", "4", "0"]);
    expect(proposalErrors({ ...d, startTime: "16:00" }, { ...ctx, packageFound: true })).toEqual(
      {},
    );
    const body = proposalPatch({ ...d, guests: "10" });
    expect(body).toMatchObject({ guests: 10 });
    expect(body).not.toHaveProperty("slot_type_id");
    expect(body).not.toHaveProperty("duration_minutes");
    expect(body).not.toHaveProperty("charter_amount");
  });

  it("switches a package draft to custom only when asked, with its length and price", () => {
    const d = { ...proposalDraft(enquiry, proposal()), length: "custom" as const };
    expect(proposalPatch(d)).toMatchObject({ duration_minutes: 240, charter_amount: 12_500_000 });
  });

  it("pre-fills a new proposal with the customer's requested duration and expected amount", () => {
    const d = proposalDraft({
      ...enquiry,
      context: { duration_minutes: 330, expected_amount_paise: 15_000_000 },
    });
    expect([d.length, d.hours, d.minutes, d.charter, d.guests]).toEqual([
      "custom",
      "5",
      "30",
      "150000",
      "8",
    ]);
  });

  it("reads a saved custom-length draft back into the form", () => {
    const d = proposalDraft(
      enquiry,
      proposal({ slot_type_id: null, slot_type_name: "Custom", duration_minutes: 330 }),
    );
    expect([d.length, d.hours, d.minutes, d.charter]).toEqual(["custom", "5", "30", "125000"]);
    expect(customMinutes(d)).toBe(330);
  });

  it("checks a package proposal (still accepted by the API)", () => {
    const d = {
      ...proposalDraft(enquiry),
      length: "package" as const,
      slotTypeId: "s-4",
      startTime: "16:00",
    };
    expect(proposalErrors(d, ctx)).toEqual({});
    expect(proposalErrors(d, { ...ctx, packageFound: false })).toEqual({
      slot: "Choose a package.",
    });
    expect(proposalErrors({ ...d, date: "2026-11-01" }, ctx).date).toMatch(/past/);
    expect(proposalErrors({ ...d, guests: "0" }, ctx).guests).toBeDefined();
    expect(proposalErrors({ ...d, expires: "2026-11-26T10:00" }, ctx).expires).toMatch(/future/);
    expect(proposalErrors({ ...d, expires: "2027-06-01T10:00" }, ctx).expires).toMatch(/90 days/);
  });

  it("checks a custom length: an hour or more, a price, and the permission", () => {
    const d = {
      ...proposalDraft(enquiry),
      length: "custom" as const,
      hours: "5",
      minutes: "0",
      charter: "1,25,000",
      startTime: "16:00",
    };
    expect(proposalErrors(d, ctx)).toEqual({});
    expect(proposalErrors({ ...d, hours: "0", minutes: "45" }, ctx).hours).toMatch(
      /at least 1 hour/,
    );
    expect(proposalErrors({ ...d, charter: "" }, ctx).charter).toMatch(/charter price/);
    expect(proposalErrors({ ...d, charter: "12.345" }, ctx).charter).toMatch(/rupees/);
    expect(proposalErrors(d, { ...ctx, canCustom: false }).length).toMatch(/Only a super admin/);
  });

  it("sends a package or a custom length, never both", () => {
    const base = {
      ...proposalDraft(enquiry),
      length: "package" as const,
      slotTypeId: "s-4",
      startTime: "16:00",
    };
    expect(proposalInput(base)).toEqual({
      yacht_id: "y-1",
      slot_type_id: "s-4",
      date: "2026-12-20",
      start_time: "16:00",
      guests: 8,
      inclusions: [],
    });
    const custom = {
      ...base,
      length: "custom" as const,
      hours: "5",
      minutes: "30",
      charter: "125000",
    };
    const body = proposalInput(custom);
    expect(body).toMatchObject({ duration_minutes: 330, charter_amount: 12_500_000 });
    expect(body).not.toHaveProperty("slot_type_id");
  });

  it("clears text and validity with null when editing a draft", () => {
    const d = {
      ...proposalDraft(
        enquiry,
        proposal({ message: "Hi", terms: "T", expires_at: "2026-12-01T18:29:00.000Z" }),
      ),
      message: " ",
      terms: "",
      expires: "",
    };
    expect(proposalPatch(d)).toMatchObject({
      message: null,
      terms: null,
      expires_at: null,
    });
    expect(proposalPatch(d)).not.toHaveProperty("addons");
  });

  it("works out the return time", () => {
    expect(returnTime("16:00", 330)).toBe("21:30");
    expect(returnTime("22:00", 180)).toBe("01:00");
    expect(returnTime("", 60)).toBeNull();
  });
});

describe("proposal wording and actions", () => {
  it("names the length", () => {
    expect(durationText(330)).toBe("5 h 30 min");
    expect(durationText(240)).toBe("4 h");
    expect(proposalLengthText(proposal())).toBe("4 hours");
    expect(proposalLengthText(proposal({ duration_minutes: 300 }))).toBe("Custom length · 5 h");
  });

  it("allows each action only in the right status", () => {
    expect(proposalActions("draft", false)).toEqual({ edit: true, send: true, revise: false });
    for (const s of ["sent", "rejected", "expired"])
      expect(proposalActions(s, false)).toEqual({ edit: false, send: false, revise: true });
    for (const s of ["accepted", "superseded"])
      expect(proposalActions(s, false)).toEqual({ edit: false, send: false, revise: false });
    expect(proposalActions("draft", true)).toEqual({ edit: false, send: false, revise: false });
    expect(proposalActions("sent", true).revise).toBe(false);
  });

  it("explains a refused custom length", () => {
    const forbidden = new ApiError("x", { kind: "http", status: 403 });
    expect(enquiryErrorMessage(forbidden, true)).toMatch(/price override/);
    expect(enquiryErrorMessage(forbidden)).toMatch(/access to enquiries/);
    const notDraft = new ApiError("x", {
      kind: "http",
      status: 409,
      body: { code: "PROPOSAL_NOT_DRAFT" },
    });
    expect(enquiryErrorMessage(notDraft)).toMatch(/Revise it/);
  });
});

describe("custom length within the yacht's hours", () => {
  const d = {
    ...proposalDraft(enquiry),
    length: "custom" as const,
    hours: "3",
    minutes: "0",
    charter: "90000",
    startTime: "16:00",
  };
  const hours = { opens: "05:00", closes: "19:00" };

  it("accepts a length that ends by closing time", () => {
    expect(proposalErrors(d, { ...ctx, hours })).toEqual({});
  });

  it("refuses one that runs past closing, or starts before opening", () => {
    expect(proposalErrors({ ...d, hours: "4" }, { ...ctx, hours }).hours).toMatch(
      /return at 20:00, after the yacht’s operating hours end \(19:00\)/,
    );
    expect(proposalErrors({ ...d, startTime: "04:30" }, { ...ctx, hours }).start).toMatch(
      /start at 05:00/,
    );
  });

  it("isn't checked for a package, or when the yacht has no hours set", () => {
    const pkg = { ...d, length: "package" as const, slotTypeId: "s-4", startTime: "18:00" };
    expect(proposalErrors(pkg, { ...ctx, hours })).toEqual({});
    expect(
      proposalErrors({ ...d, hours: "8" }, { ...ctx, hours: { opens: null, closes: null } }),
    ).toEqual({});
  });
});

describe("everything the customer sent", () => {
  const PREFERENCES = ["Live music", "Vegetarian menu"].join(String.fromCharCode(10));

  it("lists every field, with the website form's extra choices labelled", () => {
    const facts = enquiryFacts({
      ...enquiry,
      destinations: ["Kochi backwaters", "Marari beach"],
      occasion: "Anniversary",
      budget: "Around ₹1 lakh",
      preferences: PREFERENCES,
      message: "A quiet evening.",
      customer_id: "c-1",
      context: {
        flexible_dates: true,
        adults: 6,
        children: 2,
        contact_method: "whatsapp",
        duration_minutes: 300,
        type: "Motor yacht",
      },
    });
    expect(facts.budget).toBe("Around ₹1 lakh");
    expect(Object.fromEntries(facts.request)).toMatchObject({
      "Preferred date": "20 December 2026 (flexible)",
      Guests: "8 (6 adults, 2 children)",
      Yacht: "Astra One",
      Destinations: "Kochi backwaters, Marari beach",
      Occasion: "Anniversary",
      "Budget / proposed amount": "Around ₹1 lakh",
      "Requirements and preferences": PREFERENCES,
      Message: "A quiet evening.",
      "Requested duration": "5 h",
      Type: "Motor yacht",
    });
    expect(Object.fromEntries(facts.contact)).toEqual({
      Name: "Ananya Rao",
      Email: "a@example.com",
      Phone: "+919800000000",
      "Preferred contact": "WhatsApp",
      Account: "Signed-in customer",
    });
  });

  it("shows the customer's requested duration and expected amount in their own rows", () => {
    const facts = enquiryFacts({
      ...enquiry,
      context: { duration_minutes: 240, expected_amount_paise: 15_000_000 },
    });
    const rows = Object.fromEntries(facts.request);
    expect(rows["Requested duration"]).toBe("4 h");
    expect(rows["Expected amount"]).toBe("₹ 1,50,000");
    expect([facts.requestedMinutes, facts.expectedAmount]).toEqual([240, 15_000_000]);
    // Not repeated among the other choices.
    expect(facts.request.filter(([t]) => t === "Requested duration")).toHaveLength(1);
  });

  it("shows the number of days the customer asked for", () => {
    const rows = (context: Record<string, unknown>) =>
      Object.fromEntries(enquiryFacts({ ...enquiry, context }).request);
    expect(rows({ days: 3 })["Number of days"]).toBe("3 days");
    expect(rows({ days: 1 })["Number of days"]).toBe("1 day");
    expect(rows({})["Number of days"]).toBe("Not given");
    // Shown once, not repeated among the other choices.
    expect(
      enquiryFacts({ ...enquiry, context: { days: 3 } }).request.filter(([t]) => t === "Days"),
    ).toHaveLength(0);
  });

  it("says when something wasn't given", () => {
    const facts = Object.fromEntries(
      enquiryFacts({ ...enquiry, yacht: null, preferred_date: null, guests: null }).request,
    );
    expect(facts["Preferred date"]).toBe("Not given");
    expect(facts.Guests).toBe("Not given");
    expect(facts.Yacht).toBe("Flexible: any yacht");
    expect(facts["Budget / proposed amount"]).toBe("Not given");
  });

  it("labels any other context value readably", () => {
    expect(contextRows({ pets: false, tags: ["a", "b"], range: { min: 1 }, empty: "" })).toEqual([
      ["Pets", "No"],
      ["Tags", "a, b"],
      ["Range", "Min: 1"],
    ]);
  });
});
