import { commonAuthErrorMessage } from "@/features/user/auth/utils/auth-error-message";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";

const NEW_PROPOSAL =
  "This proposal is no longer available. Please ask our concierge for a new proposal.";

const CODE_MESSAGES: Record<string, string> = {
  BOOKING_NOT_FOUND: "We couldn’t find this booking on your account.",
  CANCELLATION_NOT_ALLOWED:
    "A cancellation can’t be requested for this booking: it isn’t confirmed, or the charter has started.",
  CANCELLATION_REQUEST_EXISTS:
    "A cancellation request for this booking is already waiting for our team’s decision.",
  PROPOSAL_NOT_OPEN:
    "This proposal can no longer be answered: it has expired, been replaced, already been decided, or the enquiry is closed.",
  SLOT_DOUBLE_BOOKED: NEW_PROPOSAL,
  BUFFER_TIME_VIOLATION: NEW_PROPOSAL,
  SLOT_NOT_AVAILABLE: NEW_PROPOSAL,
  PRICE_NOT_AVAILABLE: NEW_PROPOSAL,
};

/**
 * Customer text for a failed account request. Raw server messages are never
 * shown. A 401 normally never reaches here: the shared client renews the
 * session, or sends the customer to sign in.
 */
export function accountErrorMessage(error: unknown, fallback: string, notFound?: string): string {
  const message = CODE_MESSAGES[getBackendErrorDetails(error).code ?? ""];
  if (message) return message;
  if (isApiError(error)) {
    if (error.status === 401) return "Please sign in again to continue.";
    if (error.status === 403) return "This page is for customer accounts. Staff accounts can’t use it.";
    if (error.status === 404) return notFound ?? "We couldn’t find this on your account.";
    if (error.status === 400) return "Please check what you entered and try again.";
  }
  return commonAuthErrorMessage(error) ?? fallback;
}

/** True for a business-rule conflict (409), which reloading the data should reflect. */
export const isConflict = (error: unknown): boolean => isApiError(error) && error.status === 409;
