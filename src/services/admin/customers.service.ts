import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/* Admin customers (backend: /admin/customers, needs customers:read / customers:write). */

/** CustomerResponseDto */
export const customerSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  is_active: z.boolean(),
  /** Null until the customer proves their email. */
  email_verified_at: z.string().nullable(),
  last_login_at: z.string().nullable(),
  /** Bookings of every status. */
  booking_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Customer = z.infer<typeof customerSchema>;

const customerListSchema = z.object({
  items: z.array(customerSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type CustomerList = z.infer<typeof customerListSchema>;

/** CustomerBookingDto. `status` is read as a string so a new value doesn't fail the page. */
const customerBookingSchema = z.object({
  id: z.string(),
  reference: z.string(),
  yacht: z.object({ id: z.string(), name: z.string() }),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.string(),
  /** Paise incl. GST. */
  total_amount: z.number(),
  currency: z.string(),
});
export type CustomerBooking = z.infer<typeof customerBookingSchema>;

/** CustomerDetailResponseDto */
export const customerDetailSchema = customerSchema.extend({
  stats: z.object({
    /** Confirmed bookings that have not ended. */
    upcoming_count: z.number(),
    completed_count: z.number(),
    /** Cancelled or refunded. */
    cancelled_count: z.number(),
    /** Paise incl. GST, confirmed and completed bookings. */
    total_booked_amount: z.number(),
    currency: z.string(),
  }),
  /** The 20 most recent bookings, by charter date. */
  recent_bookings: z.array(customerBookingSchema),
});
export type CustomerDetail = z.infer<typeof customerDetailSchema>;

/** Query of GET /admin/customers. `limit` is 1–100 (default 20). */
export interface CustomerListQuery {
  page?: number;
  limit?: number;
  /** Matches name, email or phone. */
  search?: string;
  status?: "active" | "inactive";
  email?: "verified" | "unverified";
  sort?: "newest" | "oldest" | "name";
}

/** CreateCustomerDto. `phone` is E.164, e.g. +919876543210. */
export interface CustomerInput {
  full_name: string;
  email: string;
  phone?: string | null;
}

/** UpdateCustomerDto. The email can't change; `phone: null` removes it; `is_active: false` blocks sign-in. */
export interface CustomerPatch {
  full_name?: string;
  phone?: string | null;
  is_active?: boolean;
}

const path = (id: string) => `/admin/customers/${encodeURIComponent(id)}`;

/** GET /admin/customers */
export function listCustomers(
  query: CustomerListQuery = {},
  signal?: AbortSignal,
): Promise<CustomerList> {
  return adminApiClient.get("/admin/customers", {
    query: { ...query },
    schema: customerListSchema,
    signal,
  });
}

/** GET /admin/customers/{id} — with stats and the 20 most recent bookings. */
export function getCustomer(id: string, signal?: AbortSignal): Promise<CustomerDetail> {
  return adminApiClient.get(path(id), { schema: customerDetailSchema, signal });
}

/** POST /admin/customers (201). 409 EMAIL_EXISTS when an account already uses the email. */
export function createCustomer(input: CustomerInput): Promise<Customer> {
  return adminApiClient.post("/admin/customers", { body: input, schema: customerSchema });
}

/** PATCH /admin/customers/{id} — send only the fields that changed. */
export function updateCustomer(id: string, patch: CustomerPatch): Promise<Customer> {
  return adminApiClient.patch(path(id), { body: patch, schema: customerSchema });
}

/* Related records ---------------------------------------------------- */

const latestBookingSchema = z.object({
  items: z.array(z.object({ id: z.string(), reference: z.string(), status: z.string() })),
});

/** The customer's most recently made booking (GET /admin/bookings, needs bookings:read). */
export async function getLatestBooking(customerId: string, signal?: AbortSignal) {
  const list = await adminApiClient.get("/admin/bookings", {
    query: { customer_id: customerId, limit: 1, sort: "newest" },
    schema: latestBookingSchema,
    signal,
  });
  return list.items[0] ?? null;
}

const bookingCustomersSchema = z.object({
  items: z.array(z.object({ customer: z.object({ id: z.string() }).nullable() })),
});

/** Ids of the customers whose bookings match a reference (GET /admin/bookings?search=). */
export async function customerIdsForBookingReference(
  reference: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const list = await adminApiClient.get("/admin/bookings", {
    query: { search: reference, limit: 20 },
    schema: bookingCustomersSchema,
    signal,
  });
  return [...new Set(list.items.flatMap((b) => (b.customer ? [b.customer.id] : [])))];
}

const enquiryListSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      reference: z.string(),
      status: z.string(),
      preferred_date: z.string().nullable().optional(),
      created_at: z.string(),
      customer_id: z.string().nullable().optional(),
      contact: z
        .object({ email: z.string().nullable().optional() })
        .partial()
        .nullable()
        .optional(),
    }),
  ),
});
export type CustomerEnquiry = z.infer<typeof enquiryListSchema>["items"][number];

/**
 * The customer's enquiries. The enquiries list has no customer filter, so this
 * searches by email and keeps the ones sent by this customer or from this
 * email. Needs enquiries:read.
 */
export async function getCustomerEnquiries(
  customer: { id: string; email: string },
  signal?: AbortSignal,
): Promise<CustomerEnquiry[]> {
  const list = await adminApiClient.get("/admin/enquiries", {
    query: { search: customer.email, limit: 50 },
    schema: enquiryListSchema,
    signal,
  });
  const email = customer.email.toLowerCase();
  return list.items.filter(
    (e) => e.customer_id === customer.id || e.contact?.email?.toLowerCase() === email,
  );
}
