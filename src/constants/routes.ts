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
  accountCancellations: "/account/cancellations",
  accountEnquiries: "/account/enquiries",
  /** An enquiry and the proposals sent for it (`reference` e.g. "ENQ-2026-0001"). */
  accountEnquiry: (reference: string) => `/account/enquiries/${id(reference)}` as Route,
  /** One proposal (`proposalId` is its UUID), to accept or decline. */
  accountProposal: (proposalId: string) => `/account/proposals/${id(proposalId)}` as Route,
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
  /** The custom quote page with this yacht (and optionally a guest count) already chosen. */
  planCharterFor: (slug: string, yachtId = "", guests = "") =>
    `/plan-your-charter${withQuery({ yacht: slug, yacht_id: yachtId, guests })}` as Route,
  search: "/search",
  /** Payment link staff send for an office booking: `<this>#token=…` (`?token=` also works). */
  payLink: "/pay",
  /** A published content page (GET /content/pages/{slug}). */
  contentPage: (slug: string) => `/pages/${id(slug)}` as Route,
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
  /** A bulk availability block across yachts. */
  blockBatchNew: "/admin/availability/blocked/bulk",
  availabilityBlocked: "/admin/availability/blocked",
  /** The calendar opened on a yacht, month ("YYYY-MM") and day ("YYYY-MM-DD"); empty values are left out. */
  availabilityFor: (yachtId = "", month = "", date = "", notice = "") =>
    `/admin/availability${withQuery({ yacht: yachtId, month, date, notice })}` as Route,
  /** New availability block, optionally for a yacht and day. */
  availabilityBlockNew: (yachtId = "", date = "") =>
    `/admin/availability/blocked/new${withQuery({ yacht: yachtId, date })}` as Route,
  availabilityBlock: (blockId: string) => `/admin/availability/blocked/${id(blockId)}` as Route,

  bookings: "/admin/bookings",
  /** The bookings list for one customer; the name labels the filter. */
  bookingsForCustomer: (customerId: string, name = "") =>
    `/admin/bookings${withQuery({ customer: customerId, name })}` as Route,
  bookingNew: "/admin/bookings/new",
  cancellationRequests: "/admin/bookings/cancellation-requests",
  cancellationRequest: (requestId: string) =>
    `/admin/bookings/cancellation-requests/${id(requestId)}` as Route,
  booking: (bookingId: string) => `/admin/bookings/${id(bookingId)}` as Route,
  /** Record an offline payment for an unpaid office booking. */
  bookingPayment: (bookingId: string) => `/admin/bookings/${id(bookingId)}/payment` as Route,
  /** Email a secure payment link for an unpaid office booking. */
  bookingPaymentLink: (bookingId: string) =>
    `/admin/bookings/${id(bookingId)}/payment?mode=link` as Route,
  bookingReschedule: (bookingId: string) => `/admin/bookings/${id(bookingId)}/reschedule` as Route,
  bookingCancel: (bookingId: string) => `/admin/bookings/${id(bookingId)}/cancel` as Route,

  customers: "/admin/customers",
  customerNew: "/admin/customers/new",
  customer: (customerId: string) => `/admin/customers/${id(customerId)}` as Route,

  partners: "/admin/partners",
  partnerNew: "/admin/partners/new",
  partner: (partnerId: string) => `/admin/partners/${id(partnerId)}` as Route,

  commissions: "/admin/commissions",
  /** "Commission earned", optionally for one partner. */
  commissionsFor: (partnerId = "") =>
    `/admin/commissions${withQuery({ partner: partnerId })}` as Route,
  /** The commission rule form, optionally on a partner or one of its yachts. */
  commissionNew: (partnerId = "", yachtId = "") =>
    `/admin/commissions/new${withQuery({ partner: partnerId, yacht: yachtId })}` as Route,
  payouts: "/admin/payouts",
  /** A partner's statement for a period (YYYY-MM-DD dates). */
  payoutStatement: (partnerId: string, from = "", to = "") =>
    `/admin/payouts/statement${withQuery({ partner: partnerId, from, to })}` as Route,
  payout: (payoutId: string) => `/admin/payouts/${id(payoutId)}` as Route,
  refunds: "/admin/refunds",
  /** A payment with its refunds (under "Payments & refunds"). */
  refundPayment: (paymentId: string) => `/admin/refunds/payments/${id(paymentId)}` as Route,
  /** Refund form for a captured payment. */
  refundNew: (paymentId: string) => `/admin/refunds/payments/${id(paymentId)}/refund` as Route,
  content: "/admin/content",
  /** The content hub on banners, pages or FAQs. */
  contentKind: (kind: string) => `/admin/content${withQuery({ tab: kind })}` as Route,
  /** New banner, page or FAQ. */
  contentNew: (kind: string) => `/admin/content/${id(kind)}/new` as Route,
  /** Edit a banner, page or FAQ. */
  contentItem: (kind: string, itemId = "") => `/admin/content/${id(kind)}/${id(itemId)}` as Route,
  /** "Ready for your public view": preview, then publish. */
  contentPreview: (kind: string, itemId = "") =>
    `/admin/content/${id(kind)}/${id(itemId)}/preview` as Route,
  settings: "/admin/settings",
  staff: "/admin/staff",
  staffRoles: "/admin/staff/roles",
  notifications: "/admin/notifications",
  /** Edit one customer or staff email template. */
  notificationTemplate: (key: string) => `/admin/notifications/templates/${id(key)}` as Route,
  reports: "/admin/reports",
  /** Every report with its rows and filters, optionally on one type. */
  reportsDetailed: (type = "") => `/admin/reports/detailed${withQuery({ type })}` as Route,
  /** "Your report is being prepared": the export of one report with the current filters. */
  reportExport: (type: string, from = "", to = "", yachtId = "", partnerId = "", scope = "") =>
    `/admin/reports/export${withQuery({ type, from, to, yacht: yachtId, partner: partnerId, scope })}` as Route,
  support: "/admin/support",
  /** One customer support request. */
  supportRequest: (requestId: string) => `/admin/support/${id(requestId)}` as Route,
  enquiries: "/admin/enquiries",
  /** An enquiry; `tab` opens enquiry, proposal or history. */
  enquiry: (enquiryId: string, tab = "") =>
    `/admin/enquiries/${id(enquiryId)}${withQuery({ tab })}` as Route,
  /** "A proposal ready to share": the customer view of a draft, then send. */
  enquiryProposal: (enquiryId: string, proposalId = "") =>
    `/admin/enquiries/${id(enquiryId)}/proposal${withQuery({ id: proposalId })}` as Route,
  audit: "/admin/audit",
  /** The audit history of one record (or every record of a type). */
  auditFor: (entityType: string, entityId = "") =>
    `/admin/audit${withQuery({ entity_type: entityType, entity_id: entityId })}` as Route,
} as const satisfies Record<string, Route | ((...args: string[]) => Route)>;
