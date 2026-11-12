import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Cancellation and enquiry services against a stubbed `fetch`. Shapes follow the backend Swagger.
const API = "http://api.test";

interface Call {
  url: string;
  method: string | undefined;
  headers: Headers;
  body: unknown;
}

const stub = (body: unknown, status = 200) => {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: init.method,
      headers: new Headers(init.headers),
      body: init.body ? JSON.parse(init.body as string) : undefined,
    });
    return new Response(JSON.stringify(body), { status });
  });
  return calls;
};

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
  const { registerAuthHandlers } = await import("@/services/http/auth-handlers");
  registerAuthHandlers({
    getAccessToken: () => "customer-token",
    refresh: async () => false,
    onSessionExpired: () => {},
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const cancellations = () => import("@/services/user/cancellations.service");
const enquiries = () => import("@/services/user/enquiries.service");

const PREVIEW = {
  booking_reference: "SM-2026-0042",
  can_request: false,
  blocked_reason: "request_pending",
  paid_amount: 118000,
  refunded_amount: 0,
  refund_pending_amount: 0,
  refundable_amount: 118000,
  refund_channel: null,
  currency: "INR",
  minutes_before_departure: 1440,
  cancellation_summary: null,
  policy_refund: null,
};

const REQUEST = {
  id: "cr-1",
  booking_reference: "SM-2026-0042",
  booking: {
    reference: "SM-2026-0042",
    status: "confirmed",
    yacht_name: "Azure 52",
    date: "2026-12-16",
    start_time: "09:00",
    end_time: "13:00",
    starts_at: "2026-12-16T03:30:00.000Z",
  },
  status: "pending",
  reason: "We have to travel that week",
  requested_at: "2026-11-10T08:05:42.369Z",
  decided_at: null,
  decision_reason: null,
  refund_decision: null,
  refund_amount: null,
  currency: "INR",
};

const PROPOSAL = {
  id: "p-1",
  enquiry_id: "e-1",
  enquiry_reference: "ENQ-2026-0001",
  version: 2,
  status: "sent",
  yacht: { id: "y-1", name: "Aurora", slug: "aurora" },
  slot_type_id: null,
  slot_type_name: "4 hours",
  date: "2026-12-20",
  start_time: "16:00",
  end_time: "20:00",
  guests: 6,
  inclusions: ["Welcome drinks"],
  message: null,
  terms: null,
  pricing: {
    currency: "INR",
    charter_amount: 2000000,
    addons: [],
    addons_amount: 0,
    subtotal: 2000000,
    tax_rate: null,
    tax_amount: null,
    total_amount: null,
  },
  expires_at: null,
  sent_at: "2026-11-10T08:00:00.000Z",
  decided_at: null,
  decision_comment: null,
  checkout_session_id: null,
  created_at: "2026-11-10T08:00:00.000Z",
};

const ENQUIRY = {
  id: "e-1",
  reference: "ENQ-2026-0001",
  status: "proposal_sent",
  yacht: null,
  slot_type: null,
  preferred_date: null,
  preferred_start_time: null,
  guests: null,
  message: null,
  created_at: "2026-11-10T08:07:11.313Z",
};

describe("cancellations", () => {
  it("reads the preview with the bearer token and keeps nulls", async () => {
    const { getCancellationPreview } = await cancellations();
    const calls = stub(PREVIEW);

    const preview = await getCancellationPreview("SM-2026-0042");

    expect(calls[0]?.url).toBe(`${API}/me/bookings/SM-2026-0042/cancellation-preview`);
    expect(calls[0]?.headers.get("Authorization")).toBe("Bearer customer-token");
    expect(calls[0]?.headers.has("X-Checkout-Token")).toBe(false);
    expect(preview.refund_channel).toBeNull();
    expect(preview.policy_refund).toBeNull();
  });

  it("posts only the reason, and encodes the reference", async () => {
    const { submitCancellationRequest } = await cancellations();
    const calls = stub(REQUEST, 201);

    const created = await submitCancellationRequest("SM 1/2", { reason: "Travel" });

    expect(calls[0]?.url).toBe(`${API}/me/bookings/SM%201%2F2/cancellation-requests`);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.body).toEqual({ reason: "Travel" });
    expect(created.status).toBe("pending");
    expect(created.decided_at).toBeNull();
  });

  it("asks the backend for the page and the status filter", async () => {
    const { getCancellationRequests } = await cancellations();
    const calls = stub({ items: [REQUEST], total: 31, page: 2, limit: 10 });

    const list = await getCancellationRequests({ page: 2, limit: 10, status: "approved" });

    const url = new URL(calls[0]?.url ?? "");
    expect(url.pathname).toBe("/me/cancellation-requests");
    expect(Object.fromEntries(url.searchParams)).toEqual({ page: "2", limit: "10", status: "approved" });
    expect(list.total).toBe(31);
  });

  it("sends no status for All", async () => {
    const { getCancellationRequests } = await cancellations();
    const calls = stub({ items: [], total: 0, page: 1, limit: 10 });
    await getCancellationRequests({ page: 1, limit: 10 });
    expect(new URL(calls[0]?.url ?? "").searchParams.has("status")).toBe(false);
  });

  it("uses the backend's reason limit", async () => {
    const { CANCELLATION_REASON_MAX_LENGTH } = await cancellations();
    expect(CANCELLATION_REASON_MAX_LENGTH).toBe(1000);
  });
});

describe("enquiries and proposals", () => {
  it("lists enquiries with backend paging, keeping missing preferences null", async () => {
    const { getMyEnquiries } = await enquiries();
    const calls = stub({ items: [ENQUIRY], total: 1, page: 1, limit: 10 });

    const list = await getMyEnquiries({ page: 1, limit: 10 });

    expect(Object.fromEntries(new URL(calls[0]?.url ?? "").searchParams)).toEqual({ page: "1", limit: "10" });
    expect(list.items[0]?.yacht).toBeNull();
    expect(list.items[0]?.guests).toBeNull();
  });

  it("reads one enquiry with its proposals, and a single proposal", async () => {
    const { getMyEnquiryDetails, getMyProposal } = await enquiries();
    let calls = stub({ ...ENQUIRY, proposals: [PROPOSAL] });
    const detail = await getMyEnquiryDetails("ENQ-2026-0001");
    expect(calls[0]?.url).toBe(`${API}/me/enquiries/ENQ-2026-0001`);
    expect(detail.proposals[0]?.pricing.total_amount).toBeNull();

    calls = stub(PROPOSAL);
    await getMyProposal("p-1");
    expect(calls[0]?.url).toBe(`${API}/me/proposals/p-1`);
  });

  it("accepts with an optional comment and returns the checkout hand-off", async () => {
    const { acceptProposal } = await enquiries();
    const calls = stub({
      proposal: { ...PROPOSAL, status: "accepted", checkout_session_id: "cs-9" },
      next_step: "checkout",
      checkout_session_id: "cs-9",
      price_changed: true,
    });

    const accepted = await acceptProposal("p-1", {});

    expect(calls[0]?.url).toBe(`${API}/me/proposals/p-1/accept`);
    expect(calls[0]?.body).toEqual({});
    expect(accepted).toMatchObject({ next_step: "checkout", checkout_session_id: "cs-9", price_changed: true });
  });

  it("rejects with the comment and returns the proposal", async () => {
    const { rejectProposal } = await enquiries();
    const calls = stub({ ...PROPOSAL, status: "rejected", decision_comment: "Wrong date" });

    const rejected = await rejectProposal("p-1", { comment: "Wrong date" });

    expect(calls[0]?.body).toEqual({ comment: "Wrong date" });
    expect(rejected.status).toBe("rejected");
  });

  it("surfaces PROPOSAL_NOT_OPEN as a 409 with its code", async () => {
    const { rejectProposal } = await enquiries();
    stub({ statusCode: 409, code: "PROPOSAL_NOT_OPEN", message: "x" }, 409);
    const { getBackendErrorDetails } = await import("@/services/http/backend-error");

    const error = await rejectProposal("p-1", {}).catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 409 });
    expect(getBackendErrorDetails(error).code).toBe("PROPOSAL_NOT_OPEN");
  });

  it("rejects a status outside the contract", async () => {
    const { getMyProposal } = await enquiries();
    stub({ ...PROPOSAL, status: "maybe" });
    await expect(getMyProposal("p-1")).rejects.toMatchObject({ kind: "validation" });
  });
});

describe("new enquiry", () => {
  const CREATED = {
    enquiry_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    reference: "ENQ-2026-0001",
    status: "new",
    created_at: "2026-11-10T08:34:26.550Z",
  };

  it("posts exactly the request to /enquiries and reads the 201", async () => {
    const { createEnquiry } = await enquiries();
    const calls = stub(CREATED, 201);
    const request = {
      full_name: "Asha Menon",
      phone: "+919876543210",
      yacht_id: "y-uuid",
      slot_type_id: "s-uuid",
      preferred_date: "2026-12-20",
      preferred_start_time: "16:00",
      guests: 8,
      message: "A birthday trip with dinner on board.",
      context: { destinations: ["Kerala Backwaters"] },
    };

    const created = await createEnquiry(request);

    expect(calls[0]?.url).toBe(`${API}/enquiries`);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.body).toEqual(request);
    expect(calls[0]?.headers.get("Authorization")).toBe("Bearer customer-token");
    expect(created.reference).toBe("ENQ-2026-0001");
  });

  it("sends no credential for a guest", async () => {
    const { registerAuthHandlers } = await import("@/services/http/auth-handlers");
    registerAuthHandlers({ getAccessToken: () => null, refresh: async () => false, onSessionExpired: () => {} });
    const { createEnquiry } = await enquiries();
    const calls = stub(CREATED, 201);
    await createEnquiry({ full_name: "Asha", email: "asha@example.com", phone: "+919876543210" });
    expect(calls[0]?.headers.get("Authorization")).toBeNull();
  });

  it("keeps Retry-After readable on a 429", async () => {
    const { createEnquiry } = await enquiries();
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ statusCode: 429, message: "Too Many Requests" }), {
        status: 429,
        headers: { "Retry-After": "42" },
      }),
    );
    const error = await createEnquiry({ full_name: "A", phone: "+919876543210" }).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 429, retryAfterSeconds: 42 });
  });
});
