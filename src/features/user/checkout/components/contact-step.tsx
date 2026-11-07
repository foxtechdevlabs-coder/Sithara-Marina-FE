"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { userRoutes } from "@/constants/routes";
import { useAuthSession } from "@/features/user/auth/session";
import { createCheckoutSession, type CheckoutContact } from "@/services/user/checkout.service";

import { checkoutErrorMessage } from "../utils/checkout-error-message";
import { updateCheckoutState, type CheckoutDraft } from "../utils/checkout-store";
import {
  contactSchema,
  FULL_NAME_MAX_LENGTH,
  guestContactSchema,
  SPECIAL_REQUESTS_MAX_LENGTH,
} from "../utils/contact-schema";
import {
  CheckoutPage,
  fieldErrorClass,
  inputClass,
  labelClass,
  Notice,
  primaryButtonClass,
  primaryButtonStyle,
  SectionTitle,
  textLinkClass,
} from "./checkout-ui";
import { QuoteSummary, useQuote } from "./quote-summary";

interface ContactStepProps {
  draft: CheckoutDraft;
  /** What was typed before, e.g. when coming back to change the email. */
  saved: CheckoutContact | null;
}

type FieldErrors = Partial<Record<"full_name" | "email" | "phone" | "special_requests", string>>;

/** Contact details, then POST /checkout/sessions. Nothing is booked yet. */
export function ContactStep({ draft, saved }: ContactStepProps) {
  const authSession = useAuthSession();
  const isGuest = authSession === null;
  const { yacht, ...selection } = draft;
  const quote = useQuote({ ...selection, yacht_id: yacht.id });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted.current) return;

    const data = new FormData(event.currentTarget);
    const values = {
      full_name: String(data.get("full_name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      special_requests: String(data.get("special_requests") ?? ""),
      ...(isGuest ? { email: String(data.get("email") ?? "") } : {}),
    };
    const parsed = (isGuest ? guestContactSchema : contactSchema).safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as keyof FieldErrors] ??= issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    submitted.current = true;
    setSubmitting(true);
    const { special_requests: requests, ...required } = parsed.data;
    const contact: CheckoutContact = {
      ...required,
      ...(requests ? { special_requests: requests } : {}),
    };
    updateCheckoutState({ contact });

    try {
      const created = await createCheckoutSession({
        ...selection,
        yacht_id: yacht.id,
        contact,
      });
      updateCheckoutState({
        sessionId: created.checkout_session_id,
        awaitingVerification: created.verification_required,
        checkoutToken: null,
      });
    } catch (error) {
      submitted.current = false;
      setSubmitting(false);
      setFormError(checkoutErrorMessage(error, "We couldn’t start your checkout. Please try again."));
    }
  }

  return (
    <CheckoutPage
      heading="Your"
      headingSerif="details"
      intro="Tell us who is coming aboard. We’ll hold your charter on the next step."
      aside={
        <>
          <SectionTitle>Your charter</SectionTitle>
          <QuoteSummary quote={quote} />
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="grid max-w-[640px] gap-[28px]">
        <div>
          <label htmlFor="full_name" className={labelClass}>
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            autoComplete="name"
            maxLength={FULL_NAME_MAX_LENGTH}
            defaultValue={saved?.full_name}
            aria-invalid={Boolean(fieldErrors.full_name)}
            aria-describedby={fieldErrors.full_name ? "full_name-error" : undefined}
            className={`${inputClass} mt-[12px]`}
          />
          {fieldErrors.full_name && (
            <p id="full_name-error" className={fieldErrorClass}>
              {fieldErrors.full_name}
            </p>
          )}
        </div>

        {isGuest ? (
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={saved?.email}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : "email-hint"}
              className={`${inputClass} mt-[12px]`}
            />
            {fieldErrors.email ? (
              <p id="email-error" className={fieldErrorClass}>
                {fieldErrors.email}
              </p>
            ) : (
              <p id="email-hint" className="mt-[8px] text-[13px] leading-[18px] text-[#7a7f85]">
                We’ll send a link here to verify your checkout.{" "}
                <Link
                  href={`${userRoutes.login}?next=${encodeURIComponent(userRoutes.checkout)}`}
                  className={textLinkClass}
                >
                  Sign in
                </Link>{" "}
                if you have an account.
              </p>
            )}
          </div>
        ) : (
          <p className="text-[14px] leading-[20px] text-[#4a4f55]">
            You’re signed in, so this booking will use your account email.
          </p>
        )}

        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone, with country code
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+919876543210"
            defaultValue={saved?.phone}
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
            className={`${inputClass} mt-[12px]`}
          />
          {fieldErrors.phone && (
            <p id="phone-error" className={fieldErrorClass}>
              {fieldErrors.phone}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="special_requests" className={labelClass}>
            Special requests (optional)
          </label>
          <textarea
            id="special_requests"
            name="special_requests"
            rows={4}
            maxLength={SPECIAL_REQUESTS_MAX_LENGTH}
            defaultValue={saved?.special_requests ?? undefined}
            aria-invalid={Boolean(fieldErrors.special_requests)}
            className={`${inputClass} mt-[12px] h-auto py-[14px]`}
          />
          {fieldErrors.special_requests && (
            <p className={fieldErrorClass}>{fieldErrors.special_requests}</p>
          )}
        </div>

        {formError && <Notice alert>{formError}</Notice>}

        <div className="flex flex-wrap items-center gap-[24px]">
          <button
            type="submit"
            disabled={submitting || quote.loading || Boolean(quote.error)}
            className={primaryButtonClass}
            style={primaryButtonStyle}
          >
            {submitting ? "Starting your checkout…" : "Continue"}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
          </button>
          <Link href={userRoutes.yachtAvailability(yacht.slug)} className={textLinkClass}>
            Change your charter
          </Link>
        </div>
      </form>
    </CheckoutPage>
  );
}
