"use client";

import { LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BRAND_NAME } from "@/constants/brand";
import {
  CheckoutPage,
  Loading,
  MUTED,
  Notice,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  SectionTitle,
  SummaryRows,
  textLinkClass,
  type SummaryRow,
} from "@/features/user/checkout/components/checkout-ui";
import { useCountdown } from "@/features/user/checkout/hooks/use-countdown";
import {
  formatClockTime,
  formatDay,
  formatMinorUnits,
} from "@/features/user/yachts/utils/yacht-view";
import { useApiQuery } from "@/hooks/use-api-query";
import { openRazorpayCheckout } from "@/lib/razorpay";
import {
  getPaymentLink,
  startLinkPayment,
  verifyLinkPayment,
  type PaymentLinkSummary,
} from "@/services/user/payment-link.service";

import {
  errorCode,
  formatTimeLeft,
  isLinkNotFound,
  linkState,
  paymentLinkErrorMessage,
  takePaymentLinkToken,
} from "../utils/payment-link";

/** How often, and how long, to re-check a payment whose result isn't known yet. */
const CHECK_EVERY_MS = 3_000;
const CHECK_TIMES = 20;

const money = (amount: number, currency: string) => formatMinorUnits(amount, currency) ?? "";

/** The booking and its price, exactly as the backend gives them. */
function chargeRows(s: PaymentLinkSummary): SummaryRow[] {
  const { pricing } = s;
  const { currency } = pricing;
  return [
    { label: "Booking", value: s.reference },
    { label: "Name", value: s.contact_name },
    { label: "Yacht", value: s.yacht_name },
    { label: "Date", value: formatDay(s.date) },
    {
      label: s.slot_type_name ? `${s.slot_type_name} charter` : "Charter",
      value: `${formatClockTime(s.start_time)} – ${formatClockTime(s.end_time)} (${s.time_zone})`,
    },
    { label: "Guests", value: `${s.guest_count} ${s.guest_count === 1 ? "guest" : "guests"}` },
    ...(pricing.charter_amount === null
      ? []
      : [{ label: "Charter", value: money(pricing.charter_amount, currency) }]),
    ...pricing.addons.map((a) => ({
      label: a.quantity > 1 ? `${a.name} × ${a.quantity}` : a.name,
      value: money(a.amount, currency),
    })),
    { label: "Subtotal", value: money(pricing.subtotal, currency) },
    {
      label:
        pricing.tax_rate === null
          ? pricing.tax_label
          : `${pricing.tax_label} (${pricing.tax_rate}%)`,
      value: money(pricing.tax_amount, currency),
    },
    { label: "Total", value: money(pricing.total_amount, currency), strong: true },
  ];
}

function Summary({ s }: { s: PaymentLinkSummary }) {
  return (
    <>
      <SectionTitle>Your charter</SectionTitle>
      <SummaryRows rows={chargeRows(s)} />
    </>
  );
}

/**
 * Pay a booking from an admin-issued payment link (`/pay#token=…`): the
 * booking and amount (GET /pay), the Razorpay order (POST
 * /bookings/{id}/payments), the Razorpay modal, then verification (POST
 * /bookings/{id}/verify-payment). All three calls carry the link token.
 */
export function PaymentLinkPage() {
  // undefined: not read yet (the token is only in the browser's address bar).
  const [token, setToken] = useState<string | null>();

  useEffect(() => {
    queueMicrotask(() => setToken(takePaymentLinkToken()));
    // A newer link opened in this tab only changes the #fragment.
    const onHashChange = () => {
      if (window.location.hash.includes("token=")) setToken(takePaymentLinkToken());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (token === undefined)
    return (
      <CheckoutPage heading="Your" headingSerif="payment">
        <Loading label="Opening your payment link" />
      </CheckoutPage>
    );
  if (token === null)
    return (
      <CheckoutPage heading="Payment link" headingSerif="not found">
        <Notice alert>
          Open the payment link from your email again. It needs the whole link, including the part
          after the # sign.
        </Notice>
      </CheckoutPage>
    );
  return <LinkPayment key={token} token={token} />;
}

type Step = "idle" | "starting" | "paying" | "verifying" | "checking";
type Result = "paid" | "already_paid" | "needs_review";

function LinkPayment({ token }: { token: string }) {
  const summary = useApiQuery((signal) => getPaymentLink(token, signal), token);
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState<{ text: string; alert: boolean } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const s = summary.data;
  const payBy = s?.pay_by ?? null;
  const deadlineMs = useMemo(() => (payBy ? new Date(payBy).getTime() : null), [payBy]);
  const secondsLeft = useCountdown(deadlineMs);

  /** Re-reads the link until the payment settles (outcome "processing"). */
  async function checkUntilSettled() {
    setStep("checking");
    for (let i = 0; i < CHECK_TIMES; i++) {
      await new Promise((r) => setTimeout(r, CHECK_EVERY_MS));
      if (!alive.current) return;
      try {
        const fresh = await getPaymentLink(token);
        if (!alive.current) return;
        summary.setData(fresh);
        const state = linkState(fresh);
        if (state.kind === "paid") {
          setResult("paid");
          setStep("idle");
          return;
        }
        if (fresh.payment_status === "failed" || state.kind !== "processing") {
          if (state.kind === "payable" || fresh.payment_status === "failed")
            setMessage({ alert: true, text: "Your payment didn’t go through. You can try again." });
          setStep("idle");
          return;
        }
      } catch {
        // A missed check is retried on the next round.
      }
    }
    if (!alive.current) return;
    setStep("idle");
    setMessage({
      alert: false,
      text: "Your payment is still being confirmed. Refresh this page in a few minutes to see the result.",
    });
  }

  async function pay(booking: PaymentLinkSummary) {
    setMessage(null);
    setStep("starting");
    let paid = false;
    try {
      const order = await startLinkPayment(booking.booking_id, token);
      const { key_id: key, order_id: orderId, ...extra } = order.checkout;
      if (order.provider !== "razorpay" || typeof key !== "string" || typeof orderId !== "string")
        throw new Error("Unsupported checkout");
      if (!alive.current) return;
      setStep("paying");
      const checkout = await openRazorpayCheckout({
        key,
        orderId,
        amount: order.amount,
        currency: order.currency,
        name: BRAND_NAME,
        description: `Booking ${booking.reference}`,
        prefill: { name: booking.contact_name },
        extra,
      });
      if (!alive.current) return;
      if (checkout.kind === "closed") {
        setStep("idle");
        setMessage(
          checkout.failure
            ? {
                alert: true,
                text: `The payment didn’t go through: ${checkout.failure} You can try again.`,
              }
            : {
                alert: false,
                text: "Payment cancelled. Nothing was charged. You can pay whenever you’re ready.",
              },
        );
        return;
      }
      paid = true;
      setStep("verifying");
      const verified = await verifyLinkPayment(booking.booking_id, token, { ...checkout.response });
      if (!alive.current) return;
      switch (verified.outcome) {
        case "confirmed":
          setResult("paid");
          break;
        case "already_done":
          setResult("already_paid");
          break;
        case "needs_review":
          setResult("needs_review");
          break;
        case "processing":
          await checkUntilSettled();
          return;
        default: // "failed"
          setMessage({ alert: true, text: "Your payment didn’t go through. You can try again." });
          summary.reload();
      }
      setStep("idle");
    } catch (err) {
      if (!alive.current) return;
      // Paid in the modal but the answer was lost: the backend still settles it, so keep checking.
      if (paid && errorCode(err) !== "INVALID_PAYMENT_SIGNATURE") {
        await checkUntilSettled();
        return;
      }
      setStep("idle");
      setMessage({
        alert: true,
        text:
          err instanceof Error && err.message === "Unsupported checkout"
            ? "This payment method isn’t available here. Please contact Sithara Marina."
            : err instanceof Error && err.message.startsWith("Razorpay")
              ? "The payment window couldn’t be opened. Check your connection, turn off any blocker for this page, and try again."
              : paymentLinkErrorMessage(
                  err,
                  "We couldn’t start the payment just now. Please try again.",
                ),
      });
      const code = errorCode(err);
      if (code === "HOLD_EXPIRED" || code === "PAYMENT_NOT_ALLOWED") summary.reload();
    }
  }

  if (!s)
    return (
      <CheckoutPage heading="Your" headingSerif="payment">
        <div className="max-w-[640px]">
          {summary.loading ? (
            <Loading label="Loading your booking" />
          ) : isLinkNotFound(summary.error) ? (
            <Notice alert>{paymentLinkErrorMessage(summary.error, "")}</Notice>
          ) : (
            <Notice alert>
              We couldn’t load this payment just now.{" "}
              <button type="button" className={textLinkClass} onClick={summary.reload}>
                Try again
              </button>
            </Notice>
          )}
        </div>
      </CheckoutPage>
    );

  const state = linkState(s);
  const total = money(s.pricing.total_amount, s.pricing.currency);
  const intro = `Booking ${s.reference} · ${s.yacht_name}, ${formatDay(s.date)}`;

  // Paid: just now, earlier, or paid but waiting on staff.
  if (result || state.kind === "paid") {
    const review = result === "needs_review";
    return (
      <CheckoutPage
        heading={review ? "Payment" : "Booking"}
        headingSerif={review ? "received" : "confirmed"}
        intro={intro}
        aside={<Summary s={s} />}
      >
        <div className="max-w-[640px]" role="status">
          <p className="text-[28px] leading-[36px] tracking-[-0.5px]">{total}</p>
          <Notice>
            {review
              ? "Thank you, your payment has been received. Our team needs to finish one check before your booking is confirmed, and will be in touch."
              : result === "paid"
                ? `Thank you, ${s.contact_name}. Your payment was successful and your charter is confirmed.`
                : "This booking has already been paid. There’s nothing more to pay."}
          </Notice>
          <p className="mt-[20px] text-[14px] leading-[20px]" style={{ color: MUTED }}>
            Keep your booking reference, {s.reference}, for any questions.
          </p>
        </div>
      </CheckoutPage>
    );
  }

  // Mid-payment, the page stays put: the result decides what comes next.
  const busy = step !== "idle";
  const expired = state.kind === "expired" || (state.kind === "payable" && secondsLeft === 0);
  if (!busy && (state.kind !== "payable" || expired))
    return (
      <CheckoutPage heading="Your" headingSerif="booking" intro={intro} aside={<Summary s={s} />}>
        <div className="max-w-[640px]" aria-live="polite">
          {state.kind === "processing" ? (
            <>
              <Notice>
                Your payment is being confirmed. This usually takes a moment; please don’t pay
                again.
              </Notice>
              <div className="mt-[24px]">
                <button
                  type="button"
                  disabled={summary.loading}
                  onClick={summary.reload}
                  className={secondaryButtonClass}
                >
                  {summary.loading ? "Checking…" : "Check again"}
                </button>
              </div>
            </>
          ) : state.kind === "closed" ? (
            <Notice alert>
              This booking is {state.label}, so it can’t be paid for. Please contact Sithara Marina
              if you have questions.
            </Notice>
          ) : (
            <Notice alert>
              The time to pay for this booking has passed, so this link no longer works. Please ask
              Sithara Marina for a new payment link.
            </Notice>
          )}
          {message && <Notice alert={message.alert}>{message.text}</Notice>}
        </div>
      </CheckoutPage>
    );

  const label = {
    idle: `Pay ${money(s.amount_due, s.pricing.currency)}`,
    starting: "Preparing payment…",
    paying: "Complete the payment in the Razorpay window",
    verifying: "Confirming your payment…",
    checking: "Confirming your payment…",
  }[step];

  return (
    <CheckoutPage
      heading="Complete your"
      headingSerif="payment"
      intro={intro}
      aside={<Summary s={s} />}
    >
      <div className="max-w-[640px]" aria-live="polite">
        <p
          className="text-[12px] leading-[16px] tracking-[0.12em] uppercase"
          style={{ color: MUTED }}
        >
          Amount due
        </p>
        <p className="mt-[8px] text-[40px] leading-[48px] tracking-[-1px]">
          {money(s.amount_due, s.pricing.currency)}
        </p>
        <p className="mt-[8px] text-[15px] leading-[24px]" style={{ color: MUTED }}>
          For {s.contact_name} · includes {s.pricing.tax_label}
        </p>
        {secondsLeft !== null && (
          <p role="timer" className="mt-[16px] text-[16px] leading-[26px]">
            Your charter is held for another{" "}
            <strong className="font-medium">{formatTimeLeft(secondsLeft)}</strong>.
          </p>
        )}

        {message && <Notice alert={message.alert}>{message.text}</Notice>}
        {(step === "verifying" || step === "checking") && (
          <Loading label="Confirming your payment, please keep this page open" />
        )}

        <div className="mt-[28px]">
          <button
            type="button"
            disabled={busy}
            onClick={() => void pay(s)}
            className={`${primaryButtonClass} w-full sm:w-auto sm:min-w-[260px]`}
            style={primaryButtonStyle}
          >
            {label}
          </button>
        </div>
        <p
          className="mt-[16px] flex items-start gap-[8px] text-[13px] leading-[20px]"
          style={{ color: MUTED }}
        >
          <LockKeyhole aria-hidden="true" strokeWidth={1.5} className="mt-[2px] size-4 shrink-0" />
          Secure payment by Razorpay. Card and UPI details are entered with Razorpay, never on this
          site.
        </p>
      </div>
    </CheckoutPage>
  );
}
