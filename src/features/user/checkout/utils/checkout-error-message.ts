import { commonAuthErrorMessage } from "@/features/user/auth/utils/auth-error-message";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";

const CODE_MESSAGES: Record<string, string> = {
  INVALID_SLOT_TYPE: "That charter length is no longer offered on this yacht.",
  INVALID_ADDON: "One of your add-ons is no longer offered, or its quantity has changed.",
  GUESTS_EXCEED_CAPACITY: "That’s more guests than this yacht can take.",
  YACHT_NOT_FOUND: "This yacht is no longer available.",
  SLOT_NOT_AVAILABLE: "This time is currently unavailable. Please choose another time.",
  SLOT_DOUBLE_BOOKED: "This time overlaps another charter. Please choose a different time.",
  BUFFER_TIME_VIOLATION:
    "The yacht needs time between charters, and this start is too close to another. Please choose another start time.",
  OUTSIDE_OPERATING_HOURS: "That start time is outside the yacht’s hours for this package. Please choose another time.",
  PAST_DATE_TIME_REJECTED: "That start time has already passed. Please choose a later time.",
  PRICE_NOT_AVAILABLE: "This charter can’t be priced right now. Please choose another time.",
  GST_NOT_CONFIGURED: "We can’t work out the tax on this charter just now. Please try again later.",
  CHECKOUT_SESSION_NOT_FOUND: "This checkout has expired. Please choose your charter again.",
  HOLD_NOT_FOUND: "Your hold on this charter has ended.",
  HOLD_EXPIRED: "Your hold on this charter has ended.",
  BOOKING_NOT_FOUND: "We couldn’t find this booking.",
  TERMS_NOT_ACCEPTED: "Please accept the booking terms to continue.",
  RESEND_COOLDOWN: "Please wait a moment before requesting another email.",
  TOO_MANY_EMAILS:
    "You’ve reached the hourly limit for checkout emails. Please check your spam folder or try again later.",
  EMAIL_DELIVERY_FAILED:
    "We couldn’t send your verification email. Please check the address and try again.",
  SERVICE_UNAVAILABLE: "We’re very busy just now. Nothing has changed, so please try again.",
};

/** Text for a code the backend gives, on an error or as a session's `pricing_problem`. */
export const codeMessage = (code: string | null | undefined): string | undefined =>
  code ? CODE_MESSAGES[code] : undefined;

/** Customer text for a failed checkout request. Raw server messages are never shown. */
export function checkoutErrorMessage(error: unknown, fallback: string): string {
  const message = codeMessage(getBackendErrorDetails(error).code);
  if (message) return message;
  if (isApiError(error)) {
    if (error.status === 401) return "Please sign in again to continue this checkout.";
    if (error.status === 403) return "Checkout is for customer accounts. Staff can’t book here.";
    if (error.status === 404) return "This checkout has expired. Please choose your charter again.";
    if (error.status === 400) return "Please check your details and try again.";
  }
  return commonAuthErrorMessage(error) ?? fallback;
}
