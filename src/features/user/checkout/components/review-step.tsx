"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { userRoutes } from "@/constants/routes";
import { formatMinorUnits } from "@/features/user/yachts/utils/yacht-view";
import { useApiQuery } from "@/hooks/use-api-query";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import { createBooking } from "@/services/user/booking.service";
import {
  createHold,
  getCheckoutSession,
  getHold,
  releaseHold,
  type CheckoutSession,
  type Hold,
} from "@/services/user/checkout.service";

import { formatCountdown, useCountdown } from "../hooks/use-countdown";
import { checkoutErrorMessage, codeMessage } from "../utils/checkout-error-message";
import { clearCheckoutState, updateCheckoutState } from "../utils/checkout-store";
import {
  BODY,
  CheckoutPage,
  Loading,
  MUTED,
  Notice,
  primaryButtonClass,
  primaryButtonStyle,
  SectionTitle,
  secondaryButtonClass,
  textLinkClass,
} from "./checkout-ui";
import { SessionRows } from "./price-summary";
import { SessionEditor } from "./session-editor";

/** One POST /holds per session at a time, even when React StrictMode runs effects twice. */
const holdsInFlight = new Map<string, Promise<Hold>>();
function placeHoldOnce(sessionId: string, checkoutToken: string | null): Promise<Hold> {
  let request = holdsInFlight.get(sessionId);
  if (!request) {
    request = createHold(sessionId, checkoutToken).finally(() => holdsInFlight.delete(sessionId));
    holdsInFlight.set(sessionId, request);
  }
  return request;
}

type HoldState =
  | { kind: "placing" }
  | { kind: "active"; id: string; deadlineMs: number }
  | { kind: "expired" }
  | { kind: "failed"; error: unknown };

const activeHold = (hold: Hold): HoldState =>
  hold.status === "active" && hold.remaining_seconds > 0
    ? { kind: "active", id: hold.id, deadlineMs: Date.now() + hold.remaining_seconds * 1000 }
    : { kind: "expired" };

interface ReviewStepProps {
  sessionId: string;
  checkoutToken: string | null;
}

/**
 * The saved session, its live hold and the customer's acceptance. Totals shown
 * here are the backend's, and the one accepted is compared again on booking.
 */
export function ReviewStep({ sessionId, checkoutToken }: ReviewStepProps) {
  const router = useRouter();
  const session = useApiQuery(
    (signal) => getCheckoutSession(sessionId, checkoutToken, signal),
    sessionId,
  );
  const data = session.data;
  const canBook = Boolean(data?.pricing && data.totals && !data.pricing_problem);

  const [hold, setHold] = useState<HoldState>({ kind: "placing" });
  const [editing, setEditing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);
  const bookingInFlight = useRef(false);

  const placeHold = useCallback(async () => {
    setHold({ kind: "placing" });
    try {
      setHold(activeHold(await placeHoldOnce(sessionId, checkoutToken)));
    } catch (error) {
      setHold({ kind: "failed", error });
    }
  }, [sessionId, checkoutToken]);

  useEffect(() => {
    if (!canBook) return;
    // Deferred so StrictMode's double effect run cancels the first pass. A
    // repeated POST /holds would be harmless (200 with the same hold) anyway.
    const timer = window.setTimeout(() => void placeHold(), 0);
    return () => window.clearTimeout(timer);
  }, [canBook, placeHold]);

  const deadlineMs = hold.kind === "active" ? hold.deadlineMs : null;
  const secondsLeft = useCountdown(deadlineMs);
  const holdId = hold.kind === "active" ? hold.id : null;
  const timeIsUp = secondsLeft === 0 && holdId !== null;

  useEffect(() => {
    if (!timeIsUp || holdId === null) return;
    // The countdown is display only: the backend's clock decides.
    let cancelled = false;
    getHold(holdId, checkoutToken).then(
      (latest) => {
        if (!cancelled) setHold(activeHold(latest));
      },
      () => {
        if (!cancelled) setHold({ kind: "expired" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [timeIsUp, holdId, checkoutToken]);

  function handleSaved(updated: CheckoutSession) {
    session.setData(updated);
    setEditing(false);
    setAccepted(false); // the total may be different now
    setBookingError(null);
    setPriceNotice(null);
    if (updated.pricing && updated.totals) void placeHold();
  }

  async function handleConfirm() {
    const total = data?.totals?.total_amount;
    if (bookingInFlight.current || !accepted || total === undefined || hold.kind !== "active") {
      return;
    }
    bookingInFlight.current = true;
    setSubmitting(true);
    setBookingError(null);
    setPriceNotice(null);
    try {
      const booking = await createBooking(
        {
          checkout_session_id: sessionId,
          terms_accepted: true,
          expected_total_amount: total,
        },
        checkoutToken,
      );
      updateCheckoutState({ bookingId: booking.id }); // moves on; stays disabled meanwhile
      return;
    } catch (error) {
      const { code } = getBackendErrorDetails(error);
      if (code === "PRICE_CHANGED") {
        await handlePriceChanged(total);
      } else if (code === "HOLD_EXPIRED") {
        setHold({ kind: "expired" });
      } else {
        setBookingError(checkoutErrorMessage(error, "We couldn’t create your booking."));
      }
    }
    bookingInFlight.current = false;
    setSubmitting(false);
  }

  /** The new amount has to be seen and accepted again before another attempt. */
  async function handlePriceChanged(previousTotal: number) {
    setAccepted(false);
    try {
      const latest = await getCheckoutSession(sessionId, checkoutToken);
      session.setData(latest);
      const currency = latest.pricing?.currency ?? "INR";
      const before = formatMinorUnits(previousTotal, currency);
      const after = formatMinorUnits(latest.totals?.total_amount ?? null, currency);
      setPriceNotice(
        after
          ? `The price has changed from ${before} to ${after}. Please review it and accept again.`
          : "The price has changed. Please review your charter before continuing.",
      );
    } catch {
      session.reload();
      setPriceNotice("The price has changed. Please review your charter before continuing.");
    }
  }

  /** Releases the slot at the customer's request. If that fails the hold simply runs out. */
  async function handleCancel() {
    setLeaving(true);
    if (holdId) await releaseHold(holdId, checkoutToken).catch(() => undefined);
    const slug = data?.yacht.slug;
    clearCheckoutState();
    router.push(slug ? userRoutes.yachtAvailability(slug) : userRoutes.yachts);
  }

  if (session.loading && !data) {
    return (
      <CheckoutPage heading="Review your" headingSerif="charter">
        <Loading label="Loading your checkout" />
      </CheckoutPage>
    );
  }

  if (!data) {
    const gone = isApiError(session.error) && [401, 404].includes(session.error.status ?? 0);
    return (
      <CheckoutPage heading="Review your" headingSerif="charter">
        <Notice alert>
          {checkoutErrorMessage(session.error, "We couldn’t load your checkout just now.")}{" "}
          {gone ? (
            <Link href={userRoutes.yachts} className={textLinkClass} onClick={clearCheckoutState}>
              Back to our yachts
            </Link>
          ) : (
            <button type="button" className={textLinkClass} onClick={session.reload}>
              Try again
            </button>
          )}
        </Notice>
      </CheckoutPage>
    );
  }

  const chooseAgain = (
    <Link href={userRoutes.yachtAvailability(data.yacht.slug)} className={textLinkClass}>
      Choose another time
    </Link>
  );

  return (
    <CheckoutPage
      heading="Review your"
      headingSerif="charter"
      intro="Check the details, accept the terms and confirm."
      aside={
        <>
          <SectionTitle>Your charter</SectionTitle>
          <SessionRows session={data} />
        </>
      }
    >
      <div className="max-w-[640px]">
        {!canBook ? (
          <Notice alert>
            {codeMessage(data.pricing_problem) ??
              "We can’t work out the final price for this charter just now."}{" "}
            {chooseAgain}
          </Notice>
        ) : hold.kind === "placing" ? (
          <Loading label="Holding your charter" />
        ) : hold.kind === "failed" ? (
          <Notice alert>
            {checkoutErrorMessage(hold.error, "We couldn’t hold this charter.")}{" "}
            {isApiError(hold.error) && hold.error.status === 409 ? (
              chooseAgain
            ) : (
              <button type="button" className={textLinkClass} onClick={() => void placeHold()}>
                Try again
              </button>
            )}
          </Notice>
        ) : hold.kind === "expired" ? (
          <Notice alert>
            Your hold on this charter has ended.{" "}
            <button type="button" className={textLinkClass} onClick={() => void placeHold()}>
              Hold it again
            </button>{" "}
            · {chooseAgain}
          </Notice>
        ) : (
          <p role="timer" className="text-[16px] leading-[26px]" style={{ color: BODY }}>
            We’re holding this charter for you for another{" "}
            <strong className="font-medium">{formatCountdown(secondsLeft ?? 0)}</strong>.
          </p>
        )}

        <div className="mt-[32px]">
          <SectionTitle>Contact</SectionTitle>
          {editing ? (
            <div className="mt-[20px]">
              <SessionEditor
                session={data}
                checkoutToken={checkoutToken}
                onSaved={handleSaved}
                onCancel={() => setEditing(false)}
              />
            </div>
          ) : (
            <>
              <p className="mt-[12px] text-[16px] leading-[26px] break-words">
                {data.contact.full_name}
                <br />
                {data.contact.email}
                <br />
                {data.contact.phone}
              </p>
              {data.contact.special_requests && (
                <p className="mt-[12px] text-[15px] leading-[24px]" style={{ color: BODY }}>
                  {data.contact.special_requests}
                </p>
              )}
              <button
                type="button"
                className={`${textLinkClass} mt-[12px] text-[15px]`}
                onClick={() => setEditing(true)}
              >
                Change guests, add-ons or contact details
              </button>
            </>
          )}
        </div>

        {priceNotice && <Notice alert>{priceNotice}</Notice>}
        {bookingError && <Notice alert>{bookingError}</Notice>}

        <label className="mt-[32px] flex items-start gap-[12px] text-[15px] leading-[24px]">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.currentTarget.checked)}
            className="mt-[5px] size-[16px] shrink-0 accent-[#0d1b2a]"
          />
          <span>I accept the booking terms and the cancellation policy.</span>
        </label>

        <div className="mt-[24px] flex flex-wrap gap-[16px]">
          <button
            type="button"
            disabled={
              !accepted || !canBook || hold.kind !== "active" || submitting || editing || leaving
            }
            onClick={() => void handleConfirm()}
            className={primaryButtonClass}
            style={primaryButtonStyle}
          >
            {submitting ? "Confirming…" : "Confirm & Pay"}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
          </button>
          <button
            type="button"
            disabled={submitting || leaving}
            onClick={() => void handleCancel()}
            className={secondaryButtonClass}
          >
            {leaving ? "Releasing…" : "Cancel and release this charter"}
          </button>
        </div>
        <p className="mt-[16px] text-[14px] leading-[20px]" style={{ color: MUTED }}>
          Online payment isn’t open yet, so you won’t be charged. Confirming reserves your charter
          until the time shown on the next step.
        </p>
      </div>
    </CheckoutPage>
  );
}
