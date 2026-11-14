import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  contextEntries,
  historyText,
  parseList,
  stageLabel,
} from "@/features/admin/enquiries/utils/enquiry-format";

// Enquiries and proposals against a stubbed `fetch`, following the backend
// contract (/admin/enquiries, /admin/proposals).
const API = "http://api.test";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Call = { url: string; method: string; body: unknown };
let calls: Call[];
function stub(respond: (url: string, method: string) => Response) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      calls.push({
        url,
        method,
        body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
      });
      return respond(url, method);
    }),
  );
}

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return {
    svc: await import("@/services/admin/enquiries.service"),
    errors: await import("@/services/http/api-error"),
  };
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const enquiry = {
  id: "e-1",
  reference: "ENQ-2026-0208",
  status: "new",
  yacht: { id: "y-1", name: "Astra One", slug: "astra-one" },
  slot_type: { id: "s-4", name: "4 hours" },
  preferred_date: "2026-11-12",
  preferred_start_time: "09:00",
  guests: 8,
  message: "Seasonal dining please",
  created_at: "2026-11-01T10:00:00.000Z",
  contact: { full_name: "Ananya Menon", email: "ananya@example.com", phone: "+919800000000" },
  customer_id: null,
  context: { type: "Motor yacht", min_length_ft: 40 },
  assigned_to: null,
  updated_at: "2026-11-01T10:00:00.000Z",
};
const proposal = {
  id: "p-1",
  enquiry_id: "e-1",
  enquiry_reference: "ENQ-2026-0208",
  version: 1,
  status: "draft",
  yacht: { id: "y-1", name: "Astra One", slug: "astra-one" },
  slot_type_id: "s-4",
  slot_type_name: "4 hours",
  date: "2026-11-12",
  start_time: "09:00",
  end_time: "13:00",
  guests: 8,
  inclusions: ["Crew", "Seasonal dining"],
  message: null,
  terms: null,
  pricing: {
    currency: "INR",
    charter_amount: 11_100_000,
    addons: [],
    addons_amount: 0,
    subtotal: 11_100_000,
    tax_rate: 18,
    tax_amount: 2_025_000,
    total_amount: 13_125_000,
  },
  expires_at: null,
  sent_at: null,
  decided_at: null,
  decision_comment: null,
  checkout_session_id: null,
  created_at: "2026-11-02T10:00:00.000Z",
};

describe("enquiries service", () => {
  it("lists enquiries assigned to me with a search", async () => {
    const { svc } = await load();
    stub(() => json({ items: [enquiry], total: 1, page: 1, limit: 20 }));
    const list = await svc.listEnquiries({
      page: 1,
      limit: 20,
      assigned_to: "me",
      search: "ananya",
    });
    expect(list.items[0]?.context).toEqual({ type: "Motor yacht", min_length_ft: 40 });
    expect(calls[0]?.url).toBe(
      `${API}/admin/enquiries?page=1&limit=20&assigned_to=me&search=ananya`,
    );
  });

  it("reads the current backend shape: destinations, occasion, budget, no slot or start time", async () => {
    const { svc } = await load();
    const current: Record<string, unknown> = { ...enquiry };
    delete current.slot_type;
    delete current.preferred_start_time;
    stub(() =>
      json({
        items: [
          {
            ...current,
            destinations: ["Kochi backwaters", "Fort Kochi"],
            occasion: "Birthday",
            budget: "₹2–3 lakh",
            preferences: "Vegetarian menu",
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    );
    const [item] = (await svc.listEnquiries()).items;
    expect(item?.destinations).toEqual(["Kochi backwaters", "Fort Kochi"]);
    expect([item?.occasion, item?.budget, item?.preferences]).toEqual([
      "Birthday",
      "₹2–3 lakh",
      "Vegetarian menu",
    ]);
    expect(item?.slot_type).toBeUndefined();
  });

  it("assigns, drafts, edits, sends and revises a proposal", async () => {
    const { svc } = await load();
    stub((url, method) => {
      if (url.includes("/admin/enquiries/e-1") && method === "PATCH")
        return json({ ...enquiry, assigned_to: { id: "s-2", full_name: "Neha" } });
      if (url.endsWith("/revise")) return json({ ...proposal, id: "p-2", version: 2 }, 201);
      if (url.endsWith("/publish"))
        return json({ ...proposal, status: "sent", sent_at: "2026-11-02T11:00:00.000Z" });
      return json(proposal, method === "POST" ? 201 : 200);
    });
    await svc.updateEnquiry("e-1", { assigned_to_id: "s-2" });
    const input = {
      yacht_id: "y-1",
      slot_type_id: "s-4",
      date: "2026-11-12",
      start_time: "09:00",
      guests: 8,
      inclusions: ["Crew"],
    };
    await svc.createProposal("e-1", input);
    await svc.updateProposal("p-1", { guests: 10, message: null });
    expect((await svc.publishProposal("p-1")).status).toBe("sent");
    expect((await svc.reviseProposal("p-1")).version).toBe(2);
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["PATCH", "/admin/enquiries/e-1", { assigned_to_id: "s-2" }],
      ["POST", "/admin/enquiries/e-1/proposals", input],
      ["PATCH", "/admin/proposals/p-1", { guests: 10, message: null }],
      ["POST", "/admin/proposals/p-1/publish", undefined],
      ["POST", "/admin/proposals/p-1/revise", undefined],
    ]);
  });

  it("explains a slot that can't be proposed", async () => {
    const { svc, errors } = await load();
    stub(() => json({ statusCode: 409, code: "SLOT_DOUBLE_BOOKED", message: "x" }, 409));
    const err = await svc.publishProposal("p-1").catch((e: unknown) => e);
    expect(errors.isApiError(err)).toBe(true);
    // Loaded after the module reset, so it checks the same ApiError class the client threw.
    const format = await import("@/features/admin/enquiries/utils/enquiry-format");
    expect(format.enquiryErrorMessage(err)).toMatch(/already booked/);
  });
});

describe("enquiry wording", () => {
  it("names stages like the design and reads the customer's choices", () => {
    expect(stageLabel("proposal_sent")).toBe("Proposal ready");
    expect(stageLabel("in_progress")).toBe("Needs details");
    expect(stageLabel("accepted")).toBe("Converted");
    expect(contextEntries({ type: "Motor yacht", min_length_ft: 40, empty: "" })).toEqual([
      "Type: Motor yacht",
      "Min length ft: 40",
    ]);
    expect(historyText("proposal.send")).toBe("Proposal sent");
    expect(parseList("Private coastal charter\nCrew · Seasonal dining, ")).toEqual([
      "Private coastal charter",
      "Crew",
      "Seasonal dining",
    ]);
  });
});
