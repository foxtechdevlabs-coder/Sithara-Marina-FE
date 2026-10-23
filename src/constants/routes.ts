import type { Route } from "next";

const id = (value: string) => encodeURIComponent(value);

/**
 * Typed URL builders. Use these instead of hand-written path strings so a
 * renamed route fails at type-check time (`typedRoutes` is enabled in
 * next.config.ts).
 */

/** Customer website routes (`src/app/(user)`). */
export const userRoutes = {
  home: "/",
  yachts: "/yachts",
  yacht: (yachtId: string) => `/yachts/${id(yachtId)}` as Route,
  yachtAvailability: (yachtId: string) => `/yachts/${id(yachtId)}/availability` as Route,

  checkout: "/checkout",
  bookingConfirmation: (bookingId: string) => `/checkout/confirmation/${id(bookingId)}` as Route,

  login: "/login",
  register: "/register",

  planCharter: "/plan-your-charter",
} as const satisfies Record<string, Route | ((...args: string[]) => Route)>;

/** Admin dashboard routes (`src/app/admin`). */
export const adminRoutes = {
  login: "/admin/login",
  dashboard: "/admin/dashboard",

  fleet: "/admin/fleet",
  fleetNew: "/admin/fleet/new",
  fleetYacht: (yachtId: string) => `/admin/fleet/${id(yachtId)}` as Route,
  fleetYachtEdit: (yachtId: string) => `/admin/fleet/${id(yachtId)}/edit` as Route,
  fleetYachtPricing: (yachtId: string) => `/admin/fleet/${id(yachtId)}/pricing` as Route,

  availability: "/admin/availability",
  availabilitySlots: "/admin/availability/slots",
  availabilityBlocked: "/admin/availability/blocked",

  bookings: "/admin/bookings",
  bookingNew: "/admin/bookings/new",
  booking: (bookingId: string) => `/admin/bookings/${id(bookingId)}` as Route,

  customers: "/admin/customers",
  customer: (customerId: string) => `/admin/customers/${id(customerId)}` as Route,

  partners: "/admin/partners",
  partner: (partnerId: string) => `/admin/partners/${id(partnerId)}` as Route,

  commissions: "/admin/commissions",
  payouts: "/admin/payouts",
  refunds: "/admin/refunds",
  content: "/admin/content",
  settings: "/admin/settings",
  staff: "/admin/staff",
  staffRoles: "/admin/staff/roles",
  notifications: "/admin/notifications",
  reports: "/admin/reports",
} as const satisfies Record<string, Route | ((...args: string[]) => Route)>;
