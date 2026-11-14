"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { userRoutes } from "@/constants/routes";
import { requestPayment } from "@/features/user/payments/utils/pay-intent";
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
  updateCheckoutSession,
  type CheckoutSession,
  type Hold,
} from "@/services/user/checkout.service";
import { getPublicSettings } from "@/services/user/settings.service";
import { getYacht } from "@/services/user/yachts.service";

import { useCountdown } from "../hooks/use-countdown";
import { checkoutErrorMessage, codeMessage } from "../utils/checkout-error-message";
import {
  clearCheckoutState,
  updateCheckoutState,
  useCheckoutState,
} from "../utils/checkout-store";
import { contactSchema } from "../utils/contact-schema";
import { CheckoutPage, Loading, Notice, textLinkClass } from "./checkout-ui";
import { GuestCountField } from "./guest-count-field";
import { LeadGuestForm, type GuestErrors, type GuestValues } from "./lead-guest-form";
import {
  Accordion,
  AccordionGroup,
  CharterDetails,
  charterFromSession,
  charterSummary,
  Consent,
  NextSectionButton,
  PayAction,
  PaymentSummary,
  PayNotice,
  priceFromSession,
  BookingCard,
  ReviewPayFrame,
  useSections,
} from "./review-pay";

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

const sameContact = (values: GuestValues, saved: CheckoutSession["contact"]) =>
  values.full_name === saved.full_name &&
  values.phone === saved.phone &&
  (values.special_requests || null) === (saved.special_requests || null);

interface ReviewStepProps {
  sessionId: string;
  checkoutToken: string | null;
}

/**
 * Review & Pay, before the booking exists: the saved session, its live hold, the
 * lead guest and the customer's acceptance. Pay saves any contact changes
 * (PATCH), creates the booking with the total the customer saw (POST /bookings),
 * then hands over to the payment step, which opens Razorpay at once.
 */
export function ReviewStep({ sessionId, checkoutToken }: ReviewStepProps) {
  const router = useRouter();
  const session = useApiQuery(
    (signal) => getCheckoutSession(sessionId, checkoutToken, signal),
    sessionId,
  );
  const data = session.data;
  const slug = data?.yacht.slug ?? "";
  const yacht = useApiQuery(
    (signal) => (slug ? getYacht(slug, signal) : Promise.resolve(undefined)),
    slug,
  );
  const settings = useApiQuery((signal) => getPublicSettings(signal), "settings");
  const proposalPriceChanged = useCheckoutState()?.proposalPriceChanged === true;
  const canBook = Boolean(data?.pricing && data.totals && !data.pricing_problem);

  const sections = useSections(["charter"]);
  const [hold, setHold] = useState<HoldState>({ kind: "placing" });
  /** The count the customer chose, until the backend has priced it. */
  const [guestDraft, setGuestDraft] = useState<number | null>(null);
  const [repricing, setRepricing] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  /** The latest count still to be sent; null once the session matches it. */
  const pendingGuests = useRef<number | null>(null);
  const syncing = useRef(false);
  const repriceTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(repriceTimer.current), []);
  const [guestValues, setGuestValues] = useState<GuestValues | null>(null);
  const [guestErrors, setGuestErrors] = useState<GuestErrors>({});
  const [terms, setTerms] = useState(false);
  const [policy, setPolicy] = useState(false);
  const [consentError, setConsentError] = useState(false);
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

  /** A changed selection may change the total, so it must be accepted again. */
  function handleSaved(updated: CheckoutSession) {
    session.setData(updated);
    setTerms(false);
    setPolicy(false);
    setBookingError(null);
    setPriceNotice(null);
    if (updated.pricing && updated.totals) void placeHold();
  }

  /**
   * Sends the latest guest count to PATCH /checkout/sessions/{id}, which reprices
   * the session on the backend (its totals are what the booking is checked
   * against). One request at a time: if the customer changed the count while it
   * ran, the newest count is sent next, so the session always ends on the latest
   * choice and an older answer is never shown as current.
   */
  async function syncGuests() {
    if (syncing.current) return;
    syncing.current = true;
    setRepricing(true);
    try {
      while (pendingGuests.current !== null) {
        const target = pendingGuests.current;
        try {
          const updated = await updateCheckoutSession(sessionId, { guests: target }, checkoutToken);
          if (pendingGuests.current !== target) continue; // changed meanwhile: send the newer count
          pendingGuests.current = null;
          handleSaved(updated);
          setGuestDraft(null);
          setGuestError(null);
        } catch (error) {
          if (pendingGuests.current !== target) continue;
          pendingGuests.current = null;
          setGuestError(checkoutErrorMessage(error, "We couldn’t change the number of guests."));
        }
      }
    } finally {
      syncing.current = false;
      setRepricing(false);
    }
  }

  function changeGuests(value: number) {
    if (!data) return;
    window.clearTimeout(repriceTimer.current);
    setBookingError(null);
    const capacity = yacht.data?.capacity;
    if (capacity !== undefined && value > capacity) {
      // Known to be refused: say so, and keep payment blocked until it is fixed.
      pendingGuests.current = null;
      setGuestDraft(value);
      setGuestError(`This yacht takes up to ${capacity} guests.`);
      return;
    }
    setGuestError(null);
    if (value === data.guests && !syncing.current) {
      pendingGuests.current = null;
      setGuestDraft(null);
      return;
    }
    setGuestDraft(value);
    pendingGuests.current = value;
    // A short pause, so quick + + + presses become one price check.
    repriceTimer.current = window.setTimeout(() => void syncGuests(), 400);
  }

  async function handlePay() {
    if (bookingInFlight.current || !data) return;
    const values = guestValues ?? {
      full_name: data.contact.full_name,
      phone: data.contact.phone,
      special_requests: data.contact.special_requests ?? "",
    };
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      const next: GuestErrors = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as keyof GuestErrors] ??= issue.message;
      }
      setGuestErrors(next);
      sections.reveal("guest");
      return;
    }
    setGuestErrors({});
    if (!terms || !policy) {
      setConsentError(true);
      return;
    }
    const total = data.totals?.total_amount;
    if (total === undefined || hold.kind !== "active" || guestDraft !== null) return;

    bookingInFlight.current = true;
    setSubmitting(true);
    setBookingError(null);
    setPriceNotice(null);
    try {
      let current = data;
      if (!sameContact(parsed.data, data.contact)) {
        current = await updateCheckoutSession(
          sessionId,
          {
            contact: { ...parsed.data, special_requests: parsed.data.special_requests || null },
          },
          checkoutToken,
        );
        session.setData(current);
        setGuestValues(null);
      }
      const latestTotal = current.totals?.total_amount;
      if (latestTotal !== total) {
        await handlePriceChanged(total);
      } else {
        const booking = await createBooking(
          { checkout_session_id: sessionId, terms_accepted: true, expected_total_amount: total },
          checkoutToken,
        );
        requestPayment(booking.id); // the payment step opens Razorpay at once
        updateCheckoutState({ bookingId: booking.id }); // moves on; stays disabled meanwhile
        return;
      }
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
    setTerms(false);
    setPolicy(false);
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
    clearCheckoutState();
    router.push(data ? userRoutes.yachtAvailability(data.yacht.slug) : userRoutes.yachts);
  }

  if (!data) {
    const gone = isApiError(session.error) && [401, 404].includes(session.error.status ?? 0);
    return (
      <CheckoutPage heading="Review &" headingSerif="pay.">
        {session.loading ? (
          <Loading label="Loading your checkout" />
        ) : (
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
        )}
      </CheckoutPage>
    );
  }

  const charter = charterFromSession(data, yacht.data);
  const price = priceFromSession(data, settings.data?.tax_label ?? "GST");
  const values = guestValues ?? {
    full_name: data.contact.full_name,
    phone: data.contact.phone,
    special_requests: data.contact.special_requests ?? "",
  };
  const chooseAgain = (
    <Link href={userRoutes.yachtAvailability(data.yacht.slug)} className={textLinkClass}>
      Choose another time
    </Link>
  );
  const pricingProblem = !canBook ? (
    <>
      {codeMessage(data.pricing_problem) ??
        "We can’t work out the final price for this charter just now."}{" "}
      {chooseAgain}
    </>
  ) : null;

  const holdNotice =
    pricingProblem ??
    (hold.kind === "failed" ? (
      <>
        {checkoutErrorMessage(hold.error, "We couldn’t hold this charter.")}{" "}
        {isApiError(hold.error) && hold.error.status === 409 ? (
          chooseAgain
        ) : (
          <button type="button" className={textLinkClass} onClick={() => void placeHold()}>
            Try again
          </button>
        )}
      </>
    ) : hold.kind === "expired" ? (
      <>
        Your hold on this charter has ended.{" "}
        <button type="button" className={textLinkClass} onClick={() => void placeHold()}>
          Hold it again
        </button>{" "}
        · {chooseAgain}
      </>
    ) : null);

  const guests = guestDraft ?? data.guests;
  const capacity = yacht.data?.capacity;
  const busy = submitting || leaving;
  const total = price ? formatMinorUnits(price.total, price.currency) : null;
  const guestInvalid = Object.keys(guestErrors).length > 0;
  const pricePending = guestDraft !== null || repricing;
  const payLabel = submitting
    ? "Securing your booking…"
    : pricePending && !guestError
      ? "Updating price…"
      : total
      ? `Proceed to payment – ${total}`
      : "Proceed to payment";
  // Never pay on a price that doesn't match the chosen guest count.
  const payDisabled = !canBook || hold.kind !== "active" || pricePending || busy;
  const card = (withPay: boolean) => (
    <BookingCard
      charter={charter}
      price={price}
      settings={settings.data}
      unavailable={pricingProblem}
      pay={withPay ? { label: payLabel, disabled: payDisabled, onPay: () => void handlePay() } : undefined}
    />
  );

  return (
    <ReviewPayFrame
      secondsLeft={hold.kind === "active" ? secondsLeft : null}
      notices={
        <>
          {proposalPriceChanged && (
            <div className="mb-[24px]">
              <PayNotice tone="info">
                The price of your accepted proposal has changed since it was sent. The total shown
                here is today’s price: please review it before you pay.
              </PayNotice>
            </div>
          )}
          {holdNotice ? (
          <div className="mb-[32px]">
            <PayNotice>{holdNotice}</PayNotice>
          </div>
        ) : hold.kind === "placing" ? (
          <div className="mb-[24px]">
            <Loading label="Holding your charter" />
          </div>
        ) : null}
        </>
      }
      aside={card(true)}
    >
      <AccordionGroup>
        <Accordion
          id="charter"
          number="01"
          title="Your charter"
          summary={charterSummary(charter)}
          open={sections.isOpen("charter")}
          onToggle={() => sections.toggle("charter")}
        >
          <CharterDetails
            charter={charter}
            changeHref={userRoutes.yachtAvailability(data.yacht.slug)}
            guestControl={
              <span className="flex flex-col gap-[8px]">
                <GuestCountField
                  value={guests}
                  min={1}
                  max={capacity}
                  disabled={busy}
                  onChange={changeGuests}
                />
                {pricePending && !guestError && (
                  <span role="status" className="text-[13px] leading-[18px] text-[#4a4f55]">
                    Updating the price…
                  </span>
                )}
                {guestError && (
                  <span role="alert" className="text-[13px] leading-[18px] text-[#b42318]">
                    {guestError}
                  </span>
                )}
              </span>
            }
          />
          <NextSectionButton onClick={() => sections.advance("charter", "payment")}>
            Continue to payment
          </NextSectionButton>
        </Accordion>

        <Accordion
          id="payment"
          number="02"
          title="Payment"
          summary={total ? `Payable today · ${total}` : "Price unavailable"}
          open={sections.isOpen("payment")}
          onToggle={() => sections.toggle("payment")}
        >
          {price ? (
            <PaymentSummary price={price} />
          ) : (
            <p className="text-[15px] leading-[24px]">{pricingProblem}</p>
          )}
          <NextSectionButton onClick={() => sections.advance("payment", "guest")}>
            Continue to lead guest
          </NextSectionButton>
        </Accordion>

        <Accordion
          id="guest"
          number="03"
          title="Lead guest"
          summary={`${values.full_name || "Name needed"} · ${data.contact.email}`}
          open={sections.isOpen("guest")}
          onToggle={() => sections.toggle("guest")}
          attention={guestInvalid}
        >
          <LeadGuestForm
            values={values}
            email={data.contact.email}
            errors={guestErrors}
            disabled={busy}
            onChange={(next) => {
              setGuestValues(next);
              setGuestErrors({});
            }}
          />
        </Accordion>
      </AccordionGroup>

      <div className="mt-[40px] xl:hidden">{card(false)}</div>

      <Consent
        terms={terms}
        policy={policy}
        onTermsChange={(value) => {
          setTerms(value);
          setConsentError(false);
        }}
        onPolicyChange={(value) => {
          setPolicy(value);
          setConsentError(false);
        }}
        settings={settings.data}
        showError={consentError}
      />

      <PayAction
        price={price}
        label={payLabel}
        disabled={payDisabled}
        onPay={() => void handlePay()}
        status={
          <>
            {pricePending && !guestError && (
              <PayNotice tone="info">
                Updating the price for {guests} {guests === 1 ? "guest" : "guests"}. The amount
                below changes once it’s confirmed.
              </PayNotice>
            )}
            {guestError && (
              <PayNotice>
                {guestError} Change the number of guests before paying.
              </PayNotice>
            )}
            {guestInvalid && (
              <PayNotice>Please check the lead guest details above.</PayNotice>
            )}
            {priceNotice && <PayNotice>{priceNotice}</PayNotice>}
            {bookingError && <PayNotice>{bookingError}</PayNotice>}
          </>
        }
        secondary={
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCancel()}
            className="mt-[20px] text-[14px] underline underline-offset-2 disabled:opacity-50"
            style={{ color: "#4a4f55" }}
          >
            {leaving ? "Releasing…" : "Cancel and release this charter"}
          </button>
        }
      />
    </ReviewPayFrame>
  );
}
