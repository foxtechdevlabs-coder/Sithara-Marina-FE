/**
 * Hands "proceed to payment" from the review page to the payment step that
 * replaces it once the booking exists. Kept in memory only, so a refresh never
 * reopens Razorpay by itself: the customer presses the button again.
 */
const requested = new Set<string>();

export function requestPayment(bookingId: string): void {
  requested.add(bookingId);
}

/** True once for a requested booking, then forgets it. */
export function takePaymentRequest(bookingId: string): boolean {
  return requested.delete(bookingId);
}
