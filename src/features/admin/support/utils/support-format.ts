import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { isApiError } from "@/services/http/api-error";
import type { SupportRequest } from "@/services/admin/support.service";

/* Wording of the support screens. */

const CATEGORY: Record<string, string> = {
  general: "General",
  booking: "Booking",
  payment: "Payment",
  refund: "Refund",
  other: "Other",
};

export const categoryLabel = (category: string | null) =>
  category ? (CATEGORY[category] ?? category.replace(/[_-]+/g, " ")) : "No category";

const STATUS: Record<string, string> = { submitted: "Submitted" };
export const supportStatusLabel = (status: string) =>
  STATUS[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/[_-]+/g, " ");

/** The first line of the message, cut short for a list. */
export function messagePreview(message: string, max = 140): string {
  const line = message.trim().replace(/\s+/g, " ");
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** The reply's subject, quoting the reference so the thread can be found again. */
const replySubject = (r: SupportRequest) => `Re: ${r.subject} [${r.reference}]`;
const replyBody = (r: SupportRequest) => `Hi ${r.customer.name},

`;

/**
 * A reply opened in Gmail in the browser. There's no mailto: link: it only
 * opens something when the computer has a mail app set up.
 */
export function gmailReplyLink(r: SupportRequest): string {
  const query = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: r.customer.email.trim(),
    su: replySubject(r),
    body: replyBody(r),
  });
  return `https://mail.google.com/mail/?${query.toString()}`;
}

/** A short message for a failed support request. */
export function supportErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 403)
      return "Your account doesn’t have permission to read support requests.";
    if (error.status === 404) return "This support request doesn’t exist.";
  }
  return fleetErrorMessage(error, "This support request");
}
