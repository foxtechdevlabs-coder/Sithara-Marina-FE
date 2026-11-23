import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/*
 * The signed-in customer's notification INBOX, shown by the header bell. This
 * is not the notification PREFERENCES (which reminders and offers a customer
 * agrees to), which live in `profile.service.ts`.
 *
 * Contract: Swagger `<NEXT_PUBLIC_API_BASE_URL>/docs`, tag "me". Customer
 * accounts only (403 for staff). A notification is created with each customer
 * email, so the list matches the customer's inbox; there is no live push, so
 * the bell polls the unread count.
 */

/** `CustomerNotificationDto.type`: one per customer email. */
export const CUSTOMER_NOTIFICATION_TYPES = [
  "booking_confirmed",
  "payment_failed",
  "refund_initiated",
  "refund_processed",
  "booking_cancelled",
  "cancellation_request_received",
  "cancellation_request_approved",
  "cancellation_request_rejected",
  "booking_rescheduled",
  "charter_reminder",
  "proposal_sent",
] as const;
export type CustomerNotificationType = (typeof CUSTOMER_NOTIFICATION_TYPES)[number];

/** Most items one mark-read request may name (`MarkCustomerNotificationsReadDto.ids` maxItems). */
export const MARK_READ_MAX_IDS = 100;
/** Default page size of the list (the backend allows 1–100). */
export const NOTIFICATIONS_PAGE_LIMIT = 20;

const customerNotificationSchema = z.object({
  id: z.string().min(1),
  /**
   * Picks the icon. Kept a plain string so a type added on the backend later
   * shows with the generic icon instead of failing the whole list.
   */
  type: z.string(),
  /** Ready to show as is. */
  title: z.string(),
  /** Ready to show as is. */
  body: z.string(),
  /** "booking" (GET /bookings/:id) or "proposal" (GET /me/proposals/:id). */
  entity_type: z.string().nullish().default(null),
  /** The booking's or proposal's UUID. */
  entity_id: z.string().nullish().default(null),
  /** ISO 8601. */
  created_at: z.string(),
  /** ISO 8601 once read; null means unread. */
  read_at: z.string().nullable(),
});
export type CustomerNotification = z.infer<typeof customerNotificationSchema>;

const notificationListSchema = z.object({
  /** Newest first. */
  items: z.array(customerNotificationSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  /** Every unread notification of the customer, not only this page's. */
  unread_count: z.number().int().nonnegative(),
});
export type NotificationList = z.infer<typeof notificationListSchema>;

const unreadCountSchema = z.object({ unread_count: z.number().int().nonnegative() });

const markReadResponseSchema = z.object({
  /** Newly marked read (already-read ones are not counted). */
  marked: z.number().int().nonnegative(),
  unread_count: z.number().int().nonnegative(),
});
export type MarkNotificationsReadResponse = z.infer<typeof markReadResponseSchema>;

export type MarkNotificationsReadRequest = { ids: string[] } | { all: true };

export interface ListNotificationsOptions {
  /** 1-based. */
  page?: number;
  /** 1–100; defaults to `NOTIFICATIONS_PAGE_LIMIT`. */
  limit?: number;
  unreadOnly?: boolean;
}

/** GET /me/notifications: newest first, with the inbox-wide unread count. */
export function listMyNotifications(
  { page = 1, limit = NOTIFICATIONS_PAGE_LIMIT, unreadOnly = false }: ListNotificationsOptions = {},
  signal?: AbortSignal,
): Promise<NotificationList> {
  return apiClient.get("/me/notifications", {
    query: { page, limit, ...(unreadOnly ? { unread_only: true } : {}) },
    init: { cache: "no-store" },
    signal,
    schema: notificationListSchema,
  });
}

/** GET /me/notifications/unread-count: the bell badge. Cheap; poll it. */
export async function getMyUnreadNotificationCount(signal?: AbortSignal): Promise<number> {
  const { unread_count } = await apiClient.get("/me/notifications/unread-count", {
    init: { cache: "no-store" },
    signal,
    schema: unreadCountSchema,
  });
  return unread_count;
}

/**
 * POST /me/notifications/read with `{ ids }` (up to 100) or `{ all: true }`.
 * Unknown and already-read ids are ignored by the backend.
 */
export function markMyNotificationsRead(
  request: MarkNotificationsReadRequest,
): Promise<MarkNotificationsReadResponse> {
  return apiClient.post("/me/notifications/read", {
    body: "all" in request ? { all: true } : { ids: request.ids.slice(0, MARK_READ_MAX_IDS) },
    schema: markReadResponseSchema,
  });
}
