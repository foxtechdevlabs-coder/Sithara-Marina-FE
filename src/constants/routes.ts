import type { Route } from "next";

const id = (value: string) => encodeURIComponent(value);

/** "?a=1&b=2" from the non-empty values, or "". */
const withQuery = (values: Record<string, string>) => {
  const query = new URLSearchParams(Object.entries(values).filter(([, v]) => v)).toString();
  return query ? `?${query}` : "";
};

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
  /** Link in the checkout email: `<this>#token=<id>.<secret>` (`?token=` also works). */
  checkoutVerify: "/checkout/verify",
  bookingConfirmation: (bookingId: string) => `/checkout/confirmation/${id(bookingId)}` as Route,

  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  /** Link in the verification email: `<this>#token=<id>.<secret>` (`?token=` also works). */
  verifyEmail: "/verify-email",
  /** After POST /auth/verify-email → 200: the email is verified and the user signed in. */
  verifyEmailSuccess: "/verify-email/success",
  verifyEmailFailed: "/verify-email/failed",
  /** After registering: "Check your inbox", until the emailed link is opened. */
  verifyEmailPending: "/verify-email/pending",

  /** Customer account (signed-in only). */
  account: "/account",
  /** The account sections as one page: what the mobile "My account" bar opens. */
  accountMenu: "/account/menu",
  accountBookings: "/account/bookings",
  accountPastBookings: "/account/bookings?tab=past" as Route,
  accountBooking: (bookingId: string) => `/account/bookings/${id(bookingId)}` as Route,
  accountBookingInvoice: (bookingId: string) =>
    `/account/bookings/${id(bookingId)}/invoice` as Route,
  accountBookingCancel: (bookingId: string) => `/account/bookings/${id(bookingId)}/cancel` as Route,
  /** "Your request is with us.": right after a cancellation request is sent. */
  accountBookingCancelReceived: (bookingId: string) =>
    `/account/bookings/${id(bookingId)}/cancel/received` as Route,
  /** The cancellation's status and outcome. */
  accountBookingCancelConfirmed: (bookingId: string) =>
    `/account/bookings/${id(bookingId)}/cancel/confirmed` as Route,
  accountBookingRefund: (bookingId: string) => `/account/bookings/${id(bookingId)}/refund` as Route,
  accountEnquiries: "/account/enquiries",
  accountProfile: "/account/profile",
  accountProfileSaved: "/account/profile/saved",
  accountProfileEmail: "/account/profile/email",
  /** Email verification after a code was sent to `email` from Profile details. */
  accountProfileEmailFor: (email: string) =>
    `/account/profile/email${withQuery({ email })}` as Route,
  accountSecurity: "/account/security",
  accountSecurityUpdated: "/account/security/updated",
  accountNotifications: "/account/notifications",
  accountNotificationsSaved: "/account/notifications/saved",
  accountHelp: "/account/help",
  /** Help & support with a booking chosen as the related journey. */
  accountHelpFor: (bookingId: string) =>
    `/account/help${withQuery({ booking: bookingId })}` as Route,
  /** "Your message is with us." for support reference `reference`. */
  accountHelpSent: (reference: string) =>
    `/account/help/sent${withQuery({ ref: reference })}` as Route,
  /** First-time setup after the email is verified (no account sidebar). */
  accountSetup: "/account/setup",

  planCharter: "/plan-your-charter",
  /** The custom quote page with this yacht already chosen. */
  planCharterFor: (slug: string) => `/plan-your-charter?yacht=${id(slug)}` as Route,
  search: "/search",
} as const satisfies Record<string, Route | ((...args: string[]) => Route)>;

/** Admin dashboard routes (`src/app/admin`). */
export const adminRoutes = {
  login: "/admin/login",
  /** Staff password reset; emailed links open `<this>#token=…`. */
  resetPassword: "/admin/reset-password",
  /** First password for an invited staff member; the invitation email opens `<this>#token=…`. */
  setPassword: "/admin/set-password",
  /** Staff password recovery (request a new reset link). */
  forgotPassword: "/admin/forgot-password",
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
  partnerNew: "/admin/partners/new",
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
  enquiries: "/admin/enquiries",
  audit: "/admin/audit",
} as const satisfies Record<string, Route | ((...args: string[]) => Route)>;
