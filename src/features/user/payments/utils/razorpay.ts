import type { PaymentCheckout, RazorpayPaymentResult } from "@/services/user/booking.service";

/**
 * Razorpay Checkout, loaded from Razorpay's own script. Only the public key ID
 * and order ID from the backend are used: no secret is ever in the frontend.
 */
const SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpayFailure {
  error?: { code?: string; description?: string; reason?: string };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailure) => void) => void;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let loading: Promise<RazorpayConstructor> | null = null;

/** Loads the SDK once. A failed load can be tried again. */
export function loadRazorpay(): Promise<RazorpayConstructor> {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay needs a browser"));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () =>
      window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay did not load"));
    script.onerror = () => {
      script.remove();
      reject(new Error("Razorpay did not load"));
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

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
