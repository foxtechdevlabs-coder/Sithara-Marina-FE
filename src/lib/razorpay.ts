/*
 * Razorpay Standard Checkout in the browser: loads checkout.js once and opens
 * the payment modal. Card and UPI details never touch this app; the modal hands
 * back a signed result that the backend verifies.
 */

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

/** What the modal returns on success; sent as-is to the backend for verification. */
export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailure {
  error?: { description?: string; reason?: string };
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

/** Loads checkout.js (once per page). Rejects when it can't be reached, e.g. offline or blocked. */
export function loadRazorpay(): Promise<RazorpayConstructor> {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay needs a browser"));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay did not load"));
    script.onerror = () => {
      script.remove();
      reject(new Error("Razorpay could not be reached"));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null; // let a later attempt try again
    throw error;
  });
  return loading;
}

export type RazorpayResult =
  | { kind: "paid"; response: RazorpaySuccess }
  /** Closed without paying. `failure` is the last attempt's reason, when one failed. */
  | { kind: "closed"; failure: string | null };

export interface RazorpayCheckoutOptions {
  /** From the backend's checkout details (`key_id`, `order_id`). */
  key: string;
  orderId: string;
  /** Paise. Shown in the modal; the order's own amount is what is charged. */
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  /** Any other options the backend supplied for the checkout. */
  extra?: Record<string, unknown>;
}

/**
 * Opens the modal and settles once: paid, or closed. A failed attempt keeps
 * the modal open so the customer can try another method; its reason is
 * reported if they then close it.
 */
export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions,
): Promise<RazorpayResult> {
  const Razorpay = await loadRazorpay();
  return new Promise<RazorpayResult>((resolve) => {
    let failure: string | null = null;
    const instance = new Razorpay({
      ...options.extra,
      key: options.key,
      order_id: options.orderId,
      amount: options.amount,
      currency: options.currency,
      name: options.name,
      description: options.description,
      prefill: options.prefill,
      theme: { color: "#0d1b2a" },
      handler: (response: RazorpaySuccess) => resolve({ kind: "paid", response }),
      modal: { ondismiss: () => resolve({ kind: "closed", failure }), confirm_close: true },
    });
    instance.on("payment.failed", (response) => {
      failure = response.error?.description || response.error?.reason || "The payment failed.";
    });
    instance.open();
  });
}
