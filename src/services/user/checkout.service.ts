import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/*
 * Pricing quote, checkout sessions and inventory holds. Contract: the backend's
 * Swagger docs at `<NEXT_PUBLIC_API_BASE_URL>/docs`.
 *
 * Money is in minor units (paise) and always calculated by the backend: requests
 * carry identifiers and quantities only, never an amount.
 *
 * Except for the public quote and link verification, each call needs exactly
 * one credential: the customer's bearer token, or a guest's `X-Checkout-Token`,
 * which works for its own session only. Sending both is a 401.
 */

/** The hosted backend can take ~40 s to wake from idle (Render). */
const SLOW_START = { timeoutMs: 60_000 } as const;

const sessionPath = (id: string) => `/checkout/sessions/${encodeURIComponent(id)}`;
const holdPath = (id: string) => `/holds/${encodeURIComponent(id)}`;

/** Request options for one credential: the guest token if there is one, else the bearer token. */
export function credentialOptions(checkoutToken: string | null) {
  return checkoutToken
    ? { auth: false as const, headers: { "X-Checkout-Token": checkoutToken } }
    : {};
}

export interface CheckoutAddon {
  addon_id: string;
  quantity: number;
}

/** What is being priced or booked. Identifiers and quantities only. */
export interface CheckoutSelection {
  yacht_id: string;
  slot_type_id: string;
  /** YYYY-MM-DD, local to the marina. */
  date: string;
  /** HH:mm, local to the marina. */
  start_time: string;
  guests: number;
  addons: CheckoutAddon[];
}

// ── Pricing quote ───────────────────────────────────────────────────────────

const pricedAddonSchema = z.object({
  addon_id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  amount: z.number(),
});

const quoteSchema = z.object({
  yacht: z.object({ id: z.string(), slug: z.string(), name: z.string() }),
  slot: z.object({
    slot_type_id: z.string(),
    slot_type_name: z.string(),
    date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    duration_minutes: z.number(),
  }),
  guests: z.number(),
  currency: z.string(),
  price_kind: z.enum(["holiday", "season", "weekend", "base"]),
  base_amount: z.number(),
  extra_guest_amount: z.number(),
  charter_amount: z.number(),
  addons: z.array(pricedAddonSchema),
  addons_amount: z.number(),
  taxable_amount: z.number(),
  tax_label: z.string(),
  tax_rate: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
});
export type Quote = z.infer<typeof quoteSchema>;

/**
 * POST /pricing/quote (public). 400 `INVALID_SLOT_TYPE`, `INVALID_ADDON`,
 * `GUESTS_EXCEED_CAPACITY` · 404 `YACHT_NOT_FOUND` · 409 `SLOT_NOT_AVAILABLE`,
 * `PRICE_NOT_AVAILABLE`, `GST_NOT_CONFIGURED`.
 */
export function getPricingQuote(selection: CheckoutSelection, signal?: AbortSignal): Promise<Quote> {
  return apiClient.post("/pricing/quote", {
    ...SLOW_START,
    auth: false,
    body: selection,
    signal,
    schema: quoteSchema,
  });
}

// ── Checkout sessions ───────────────────────────────────────────────────────

const pricingSchema = z.object({
  currency: z.string(),
  charter_amount: z.number(),
  addons: z.array(pricedAddonSchema),
  addons_amount: z.number(),
  subtotal: z.number(),
});

export interface CheckoutContact {
  full_name: string;
  /** Required for a guest. A signed-in customer leaves it out. */
  email?: string;
  /** E.164. */
  phone: string;
  special_requests?: string | null;
}

export interface CreateCheckoutSessionRequest extends CheckoutSelection {
  contact: CheckoutContact;
}

const sessionCreatedSchema = z.object({
  checkout_session_id: z.string(),
  /** True for a guest: the emailed link must be used next. */
  verification_required: z.boolean(),
  expires_at: z.string(),
  pricing: pricingSchema,
});
export type CheckoutSessionCreated = z.infer<typeof sessionCreatedSchema>;

/**
 * POST /checkout/sessions, with the bearer token when signed in and no
 * credential for a guest. 400 selection errors · 403 staff token · 404
 * `YACHT_NOT_FOUND` · 409 `SLOT_NOT_AVAILABLE`, `PRICE_NOT_AVAILABLE` · 429
 * `RESEND_COOLDOWN`, `TOO_MANY_EMAILS` · 503 `SERVICE_UNAVAILABLE`,
 * `EMAIL_DELIVERY_FAILED`.
 */
export function createCheckoutSession(
  request: CreateCheckoutSessionRequest,
): Promise<CheckoutSessionCreated> {
  return apiClient.post("/checkout/sessions", {
    ...SLOW_START,
    body: request,
    schema: sessionCreatedSchema,
  });
}

const verifiedSessionSchema = z.object({
  checkout_session_id: z.string(),
  /**
   * `customer_session`: a new account, signed in. `sign_in_required`: the email
   * has an account, so no credential comes back. `checkout_token`: send it as
   * `X-Checkout-Token`, for this session only.
   */
  access: z.enum(["customer_session", "sign_in_required", "checkout_token"]),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  checkout_token: z.string().optional(),
  expires_at: z.string().optional(),
});
export type VerifiedCheckoutSession = z.infer<typeof verifiedSessionSchema>;

/** POST /checkout/sessions/verify (public). 400 `INVALID_TOKEN`: one answer for every bad link. */
export function verifyCheckoutSession(token: string): Promise<VerifiedCheckoutSession> {
  return apiClient.post("/checkout/sessions/verify", {
    ...SLOW_START,
    auth: false,
    body: { token },
    schema: verifiedSessionSchema,
  });
}

const sessionSchema = z.object({
  id: z.string(),
  expires_at: z.string(),
  yacht: z.object({ id: z.string(), slug: z.string(), name: z.string() }),
  slot: z.object({
    slot_type_id: z.string().nullable(),
    slot_type_name: z.string().nullable(),
    date: z.string(),
    start_time: z.string(),
    end_time: z.string().nullable(),
  }),
  guests: z.number(),
  addons: z.array(z.object({ addon_id: z.string(), quantity: z.number() })),
  contact: z.object({
    full_name: z.string(),
    email: z.string(),
    phone: z.string(),
    special_requests: z.string().nullable(),
  }),
  /** Null when the selection cannot be priced now; `pricing_problem` says why. */
  pricing: pricingSchema.nullable(),
  pricing_problem: z.string().nullable(),
  /** Null while the selection cannot be priced or no GST rate is set. */
  totals: z
    .object({ tax_rate: z.number(), tax_amount: z.number(), total_amount: z.number() })
    .nullable(),
});
export type CheckoutSession = z.infer<typeof sessionSchema>;

/** GET /checkout/sessions/{id}. 404 `CHECKOUT_SESSION_NOT_FOUND`, also once it has expired. */
export function getCheckoutSession(
  id: string,
  checkoutToken: string | null,
  signal?: AbortSignal,
): Promise<CheckoutSession> {
  return apiClient.get(sessionPath(id), {
    ...SLOW_START,
    ...credentialOptions(checkoutToken),
    signal,
    schema: sessionSchema,
  });
}

export interface UpdateCheckoutSessionRequest {
  guests?: number;
  /** Replaces the whole list. */
  addons?: CheckoutAddon[];
  contact?: { full_name?: string; phone?: string; special_requests?: string | null };
}

/** PATCH /checkout/sessions/{id}. Selection problems come back as errors here. */
export function updateCheckoutSession(
  id: string,
  request: UpdateCheckoutSessionRequest,
  checkoutToken: string | null,
): Promise<CheckoutSession> {
  return apiClient.patch(sessionPath(id), {
    ...SLOW_START,
    ...credentialOptions(checkoutToken),
    body: request,
    schema: sessionSchema,
  });
}

// ── Inventory holds ─────────────────────────────────────────────────────────

const holdSchema = z.object({
  id: z.string(),
  checkout_session_id: z.string(),
  /** As of now: an active hold past its deadline reads `expired`. */
  status: z.enum(["active", "released", "expired"]),
  release_reason: z.enum(["customer", "superseded"]).nullable(),
  expires_at: z.string(),
  /** By the server's clock, for the countdown. */
  remaining_seconds: z.number(),
  guests: z.number(),
});
export type Hold = z.infer<typeof holdSchema>;

/**
 * POST /holds. 200 when this session already holds the slot, 201 for a new
 * hold, so calling it again never creates a second one. 409
 * `SLOT_NOT_AVAILABLE`, `PRICE_NOT_AVAILABLE` · 503 `SERVICE_UNAVAILABLE`:
 * nothing was held, safe to try again.
 */
export function createHold(checkoutSessionId: string, checkoutToken: string | null): Promise<Hold> {
  return apiClient.post("/holds", {
    ...SLOW_START,
    ...credentialOptions(checkoutToken),
    body: { checkout_session_id: checkoutSessionId },
    schema: holdSchema,
  });
}

/** GET /holds/{id}. 404 `HOLD_NOT_FOUND`. */
export function getHold(id: string, checkoutToken: string | null): Promise<Hold> {
  return apiClient.get(holdPath(id), {
    ...SLOW_START,
    ...credentialOptions(checkoutToken),
    schema: holdSchema,
  });
}

/** DELETE /holds/{id}: releases the slot. 204 · 404 `HOLD_NOT_FOUND`. */
export async function releaseHold(id: string, checkoutToken: string | null): Promise<void> {
  await apiClient.delete(holdPath(id), { ...SLOW_START, ...credentialOptions(checkoutToken) });
}
