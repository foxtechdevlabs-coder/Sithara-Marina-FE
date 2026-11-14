import { z } from "zod";

import { getPublicEnv } from "@/config/env";
import { buildUrl } from "@/services/http/build-url";

import { adminApiClient } from "./admin-api-client";

/*
 * Staff alerts (backend: /admin/notifications, needs notifications:read /
 * notifications:write), the customer email log and the email templates
 * (settings:read / settings:write). Enum-like fields are read as strings so a
 * new backend value doesn't fail the page.
 */

const nullableString = z.string().nullable();

/* Alerts ---------------------------------------------------------------- */

/** AdminAlertDto */
export const alertSchema = z.object({
  id: z.string(),
  type: z.string(),
  /** info, warning, critical */
  severity: z.string(),
  title: z.string(),
  body: z.string(),
  /** What to open: booking, enquiry, cancellation_request or support_request. */
  entity_type: nullableString,
  entity_id: nullableString,
  created_at: z.string(),
  /** Null: unread. */
  read_at: nullableString,
});
export type Alert = z.infer<typeof alertSchema>;

const alertListSchema = z.object({
  items: z.array(alertSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  /** Every unread alert this user may see, for the badge. */
  unread_count: z.number(),
});
export type AlertList = z.infer<typeof alertListSchema>;

export const ALERT_TYPES = [
  "booking_confirmed",
  "payment_needs_review",
  "refund_failed",
  "refund_processed",
  "cancellation_requested",
  "enquiry_received",
  "proposal_accepted",
  "proposal_rejected",
  "support_requested",
] as const;

export interface AlertQuery {
  page?: number;
  limit?: number;
  unread_only?: boolean;
  type?: (typeof ALERT_TYPES)[number];
}

/** GET /admin/notifications — newest first, with the unread count. */
export function listAlerts(query: AlertQuery = {}, signal?: AbortSignal): Promise<AlertList> {
  return adminApiClient.get("/admin/notifications", {
    query: { ...query },
    schema: alertListSchema,
    signal,
  });
}

/** POST /admin/notifications/read — some alerts (up to 100) or all of them. */
export function markAlertsRead(input: { ids: string[] } | { all: true }) {
  return adminApiClient.post("/admin/notifications/read", {
    body: input,
    schema: z.object({ marked: z.number(), unread_count: z.number() }),
  });
}

/** POST /admin/notifications/stream-token — single use, valid for `expires_in` seconds. 503 when live updates are down. */
export function getStreamToken() {
  return adminApiClient.post("/admin/notifications/stream-token", {
    schema: z.object({ token: z.string(), expires_in: z.number() }),
  });
}

/** The URL of the live alert stream (GET /admin/notifications/stream?token=). */
export function streamUrl(token: string): string {
  return buildUrl(getPublicEnv().NEXT_PUBLIC_API_URL, "/admin/notifications/stream", { token });
}

/* Email log ------------------------------------------------------------- */

export const TEMPLATE_KEYS = [
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
  "staff_payment_review",
  "staff_refund_failed",
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

/** EmailLogEntryDto */
export const emailSchema = z.object({
  id: z.string(),
  template_key: z.string(),
  recipient: z.string(),
  subject: z.string(),
  /** queued, sending, sent, failed */
  status: z.string(),
  attempts: z.number(),
  /** Why the last try failed (an error name). */
  last_error: nullableString,
  entity_type: nullableString,
  entity_id: nullableString,
  sent_at: nullableString,
  /** Next try, while queued. */
  next_attempt_at: nullableString,
  created_at: z.string(),
});
export type Email = z.infer<typeof emailSchema>;

export const emailDetailSchema = emailSchema.extend({
  body_text: z.string(),
  /** For a sandboxed iframe. */
  body_html: z.string(),
});
export type EmailDetail = z.infer<typeof emailDetailSchema>;

export interface EmailQuery {
  page?: number;
  limit?: number;
  status?: "queued" | "sending" | "sent" | "failed";
  template_key?: TemplateKey;
  /** Part of the recipient address. */
  recipient?: string;
  /** Emails about this booking, enquiry, proposal or refund. */
  entity_id?: string;
}

/** GET /admin/email-log */
export function listEmails(query: EmailQuery = {}, signal?: AbortSignal) {
  return adminApiClient.get("/admin/email-log", {
    query: { ...query },
    schema: z.object({
      items: z.array(emailSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
    signal,
  });
}

/** GET /admin/email-log/{id} — with the email as sent. */
export function getEmail(id: string, signal?: AbortSignal): Promise<EmailDetail> {
  return adminApiClient.get(`/admin/email-log/${encodeURIComponent(id)}`, {
    schema: emailDetailSchema,
    signal,
  });
}

/** POST /admin/email-log/{id}/resend — failed emails only (409 NOTIFICATION_NOT_FAILED). */
export function resendEmail(id: string): Promise<Email> {
  return adminApiClient.post(`/admin/email-log/${encodeURIComponent(id)}/resend`, {
    schema: emailSchema,
  });
}

/* Templates ------------------------------------------------------------- */

const templateText = z.object({ subject: z.string(), heading: z.string(), body: z.string() });

/** NotificationTemplateDto */
export const templateSchema = templateText.extend({
  key: z.string(),
  name: z.string(),
  /** When it is sent, and to whom. */
  description: z.string(),
  /** customer or staff */
  audience: z.string(),
  channel: z.string(),
  /** False: the default text is in use. */
  is_customised: z.boolean(),
  updated_at: nullableString,
  updated_by_id: nullableString,
  variables: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      /** The body must keep it. */
      required: z.boolean(),
      /** text or url */
      kind: z.string(),
      /** Used in previews. */
      sample: z.string(),
    }),
  ),
  /** The default text, for reset. */
  defaults: templateText,
});
export type Template = z.infer<typeof templateSchema>;
export type TemplateText = z.infer<typeof templateText>;

/** GET /admin/notification-templates */
export function listTemplates(signal?: AbortSignal) {
  return adminApiClient.get("/admin/notification-templates", {
    query: { limit: 100 },
    schema: z.object({
      items: z.array(templateSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
    signal,
  });
}

const templatePath = (key: string) => `/admin/notification-templates/${encodeURIComponent(key)}`;

/** GET /admin/notification-templates/{key} */
export function getTemplate(key: string, signal?: AbortSignal): Promise<Template> {
  return adminApiClient.get(templatePath(key), { schema: templateSchema, signal });
}

/** PATCH /admin/notification-templates/{key}. 400 INVALID_TEMPLATE with `details.problems`. */
export function saveTemplate(key: string, text: Partial<TemplateText>): Promise<Template> {
  return adminApiClient.patch(templatePath(key), { body: text, schema: templateSchema });
}

/** DELETE /admin/notification-templates/{key} — back to the default text. */
export function resetTemplate(key: string): Promise<Template> {
  return adminApiClient.delete(templatePath(key), { schema: templateSchema });
}

/** POST /admin/notification-templates/{key}/preview — the email with sample values, without saving. */
export function previewTemplate(key: string, text: Partial<TemplateText>, signal?: AbortSignal) {
  return adminApiClient.post(`${templatePath(key)}/preview`, {
    body: text,
    schema: z.object({ subject: z.string(), html: z.string(), text: z.string() }),
    signal,
  });
}

/** The problems listed in a 400 INVALID_TEMPLATE body, if any. */
export function templateProblems(body: unknown): string[] {
  const b = body as { details?: { problems?: unknown } } | null;
  const raw = b?.details?.problems;
  if (!Array.isArray(raw)) return [];
  return raw.map((p) =>
    typeof p === "string"
      ? p
      : typeof p === "object" && p && "message" in p
        ? String((p as { message: unknown }).message)
        : JSON.stringify(p),
  );
}
