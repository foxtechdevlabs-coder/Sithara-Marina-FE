import { loadRazorpay } from "@/lib/razorpay";
import type { PaymentCheckout, RazorpayPaymentResult } from "@/services/user/booking.service";

/**
 * Razorpay Checkout, loaded from Razorpay's own script. Only the public key ID
 * and order ID from the backend are used: no secret is ever in the frontend.
 * The script loader is shared with the payment link page (`@/lib/razorpay`).
 */
export interface OpenRazorpayOptions {
  payment: PaymentCheckout;
  description: string;
  prefill: { name: string; email: string; contact: string | null };
  /** Razorpay's success result. Not proof of payment: the backend verifies it. */
  onSuccess: (result: RazorpayPaymentResult) => void;
  /** A failed attempt. The modal stays open so the customer can try again. */
  onFailure: (reason: string | undefined) => void;
  /** The customer closed the modal without a successful payment. */
  onDismiss: () => void;
}

/** Opens the modal with the backend's key, order, amount and currency. */
export async function openRazorpay(options: OpenRazorpayOptions): Promise<void> {
  const Razorpay = await loadRazorpay();
  const { payment, prefill } = options;
  let succeeded = false;
  const checkout = new Razorpay({
    key: payment.checkout.key_id,
    order_id: payment.checkout.order_id,
    amount: payment.amount,
    currency: payment.currency,
    name: "Sithara Marina",
    description: options.description,
    prefill: {
      name: prefill.name,
      email: prefill.email,
      ...(prefill.contact ? { contact: prefill.contact } : {}),
    },
    theme: { color: "#0b1a2e" },
    handler: (response: RazorpayPaymentResult) => {
      succeeded = true;
      options.onSuccess({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
    modal: {
      ondismiss: () => {
        if (!succeeded) options.onDismiss();
      },
    },
  });
  checkout.on("payment.failed", (response) =>
    options.onFailure(response.error?.description ?? response.error?.reason),
  );
  checkout.open();
}
