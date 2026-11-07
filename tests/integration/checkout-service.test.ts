import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Checkout and booking services against a stubbed `fetch`. Shapes follow the backend Swagger schemas.
const API = "http://api.test";
const TOKEN = "token-id.token-secret";

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
    return new Response(status === 204 ? null : JSON.stringify(body), { status });
  });
  return calls;
};

const checkout = () => import("@/services/user/checkout.service");
const booking = () => import("@/services/user/booking.service");

const SELECTION = {
  yacht_id: "y-1",
  slot_type_id: "s-1",
  date: "2026-12-20",
  start_time: "09:00",
  guests: 2,
  addons: [{ addon_id: "a-1", quantity: 1 }],
};

const PRICING = {
  currency: "INR",
  charter_amount: 2_000_000,
  addons: [{ addon_id: "a-1", name: "Chef", quantity: 1, unit_price: 200_000, amount: 200_000 }],
  addons_amount: 200_000,
  subtotal: 2_200_000,
};

const SESSION = {
  id: "cs-1",
  expires_at: "2026-12-01T00:00:00.000Z",
  yacht: { id: "y-1", slug: "aurora", name: "Aurora" },
  slot: {
    slot_type_id: "s-1",
    slot_type_name: "4-hour",
    date: "2026-12-20",
    start_time: "09:00",
    end_time: "13:00",
  },
  guests: 2,
  addons: [{ addon_id: "a-1", quantity: 1 }],
  filters: {},
  contact: {
    full_name: "Asha Menon",
    email: "asha@example.com",
    phone: "+919876543210",
    special_requests: null,
  },
  pricing: PRICING,
  pricing_problem: null,
  totals: { tax_rate: 18, tax_amount: 396_000, total_amount: 2_596_000 },
};

const HOLD = {
  id: "h-1",
  checkout_session_id: "cs-1",
  status: "active",
  release_reason: null,
  expires_at: "2026-12-01T00:10:00.000Z",
  remaining_seconds: 600,
  yacht: SESSION.yacht,
  slot: { ...SESSION.slot, starts_at: "x", ends_at: "y" },
  guests: 2,
  pricing: PRICING,
};

const BOOKING_CREATED = {
  id: "b-1",
  reference: "SM-2026-0001",
  status: "pending_payment",
  hold_expires_at: "2026-12-01T00:10:00.000Z",
  remaining_seconds: 600,
  currency: "INR",
  subtotal: 2_200_000,
  tax_amount: 396_000,
  total_amount: 2_596_000,
  created_at: "2026-12-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

/** With a signed-in customer in the shared client, to prove which credential is sent. */
async function signIn() {
  const { registerAuthHandlers } = await import("@/services/http/auth-handlers");
  registerAuthHandlers({
    getAccessToken: () => "bearer-token",
    refresh: async () => false,
    onSessionExpired: () => {},
  });
}

describe("credentials", () => {
  it("sends only X-Checkout-Token for a guest, even in a signed-in tab", async () => {
    await signIn();
    const { getCheckoutSession } = await checkout();
    const calls = stub(SESSION);

    await getCheckoutSession("cs-1", TOKEN);

    expect(calls[0]?.url).toBe(`${API}/checkout/sessions/cs-1`);
    expect(calls[0]?.headers.get("X-Checkout-Token")).toBe(TOKEN);
    expect(calls[0]?.headers.get("Authorization")).toBeNull();
    expect(calls[0]?.url).not.toContain(TOKEN);
  });

  it("sends only the bearer token without a checkout token", async () => {
    await signIn();
    const { getCheckoutSession } = await checkout();
    const calls = stub(SESSION);

    await getCheckoutSession("cs-1", null);

    expect(calls[0]?.headers.get("Authorization")).toBe("Bearer bearer-token");
    expect(calls[0]?.headers.has("X-Checkout-Token")).toBe(false);
  });

  it("uses the same rule for holds and bookings", async () => {
    const { createHold, getHold, releaseHold } = await checkout();
    const { getBooking, getBookingStatus, createBooking } = await booking();
    let calls = stub(HOLD, 201);
    await createHold("cs-1", TOKEN);
    await getHold("h-1", TOKEN);
    calls = [...calls, ...stub(null, 204)];
    await releaseHold("h-1", TOKEN);
    calls = [...calls, ...stub(BOOKING_CREATED, 201)];
    await createBooking(
      { checkout_session_id: "cs-1", terms_accepted: true, expected_total_amount: 2_596_000 },
      TOKEN,
    );
    await getBookingStatus("b-1", TOKEN).catch(() => undefined);
    await getBooking("b-1", TOKEN).catch(() => undefined);

    for (const call of calls) {
      expect(call.headers.get("X-Checkout-Token")).toBe(TOKEN);
      expect(call.headers.get("Authorization")).toBeNull();
    }
  });
});

describe("request bodies", () => {
  it("quotes publicly with identifiers and quantities only", async () => {
    await signIn();
    const { getPricingQuote } = await checkout();
    const calls = stub({
      yacht: SESSION.yacht,
      slot: { ...SESSION.slot, duration_minutes: 240 },
      guests: 2,
      currency: "INR",
      price_kind: "base",
      base_amount: 2_000_000,
      extra_guest_amount: 0,
      charter_amount: 2_000_000,
      addons: PRICING.addons,
      addons_amount: 200_000,
      taxable_amount: 2_200_000,
      tax_label: "GST",
      tax_rate: 18,
      tax_amount: 396_000,
      total_amount: 2_596_000,
    });

    const quote = await getPricingQuote(SELECTION);

    expect(calls[0]?.url).toBe(`${API}/pricing/quote`);
    expect(calls[0]?.body).toEqual(SELECTION);
    expect(calls[0]?.headers.get("Authorization")).toBeNull();
    expect(quote.total_amount).toBe(2_596_000);
  });

  it("creates a hold with the session id alone", async () => {
    const { createHold } = await checkout();
    const calls = stub(HOLD);

    const hold = await createHold("cs-1", null);

    expect(calls[0]?.url).toBe(`${API}/holds`);
    expect(calls[0]?.body).toEqual({ checkout_session_id: "cs-1" });
    expect(hold.remaining_seconds).toBe(600);
  });

  it("creates a booking with exactly the three documented fields", async () => {
    const { createBooking } = await booking();
    const calls = stub(BOOKING_CREATED, 201);
    const request = {
      checkout_session_id: "cs-1",
      terms_accepted: true,
      expected_total_amount: 2_596_000,
    };

    await createBooking(request, null);

    expect(calls[0]?.url).toBe(`${API}/bookings`);
    expect(calls[0]?.body).toEqual(request);
  });

  it("verifies a link with the token alone, and never sends a bearer token", async () => {
    await signIn();
    const { verifyCheckoutSession } = await checkout();
    const calls = stub({
      checkout_session_id: "cs-1",
      access: "checkout_token",
      checkout_token: TOKEN,
      expires_at: "2026-12-01T00:00:00.000Z",
    });

    const verified = await verifyCheckoutSession("link.secret");

    expect(calls[0]?.body).toEqual({ token: "link.secret" });
    expect(calls[0]?.headers.get("Authorization")).toBeNull();
    expect(verified.access).toBe("checkout_token");
  });
});

describe("responses", () => {
  it("accepts a session that cannot be priced, and keeps its selection", async () => {
    const { getCheckoutSession } = await checkout();
    stub({ ...SESSION, pricing: null, totals: null, pricing_problem: "SLOT_NOT_AVAILABLE" });

    const session = await getCheckoutSession("cs-1", null);

    expect(session.pricing).toBeNull();
    expect(session.pricing_problem).toBe("SLOT_NOT_AVAILABLE");
    expect(session.yacht.name).toBe("Aurora");
  });

  it("rejects a booking status outside the contract", async () => {
    const { getBookingStatus } = await booking();
    stub({ id: "b-1", reference: "SM-1", status: "paid", hold_expires_at: null });

    await expect(getBookingStatus("b-1", null)).rejects.toMatchObject({ kind: "validation" });
  });
});
