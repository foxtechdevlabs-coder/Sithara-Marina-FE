"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { userRoutes } from "@/constants/routes";
import {
  fieldErrorClass,
  inputClass,
  labelClass,
  Loading,
  Notice,
  primaryButtonClass,
  primaryButtonStyle,
  SectionTitle,
  SummaryRows,
  textLinkClass,
} from "@/features/user/checkout/components/checkout-ui";
import {
  AccountPage,
  DetailGrid,
  StatusPill,
} from "@/features/user/profile/components/account-ui";
import { accountErrorMessage, isConflict } from "@/features/user/profile/utils/account-error-message";
import { formatDateTime, formatMinorUnits } from "@/features/user/yachts/utils/yacht-view";
import { useApiQuery } from "@/hooks/use-api-query";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import {
  CANCELLATION_REASON_MAX_LENGTH,
  getCancellationPreview,
  submitCancellationRequest,
  type CancellationRequest,
} from "@/services/user/cancellations.service";

import {
  BLOCKED_REASON,
  formatLeadTime,
  REFUND_CHANNEL,
  REFUND_DECISION,
  REQUEST_STATUS,
} from "./cancellation-labels";

const NOT_FOUND =
  "We couldn’t find this booking on your account. It may belong to another account, or its unpaid hold has ended.";

/**
 * Cancellation for one booking: the backend's preview (eligibility, money paid
 * and refundable, policy), then a reason. A submitted request is only a
 * request: our team decides, so nothing here says the booking is cancelled.
 */
export function CancelBooking({ reference }: { reference: string }) {
  const preview = useApiQuery((signal) => getCancellationPreview(reference, signal), reference);
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<CancellationRequest | null>(null);
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setFieldError("Please tell us why you’d like to cancel.");
      return;
    }
    if (trimmed.length > CANCELLATION_REASON_MAX_LENGTH) {
      setFieldError(`Please keep this under ${CANCELLATION_REASON_MAX_LENGTH} characters.`);
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setFieldError(null);
    setFormError(null);
    try {
      setSubmitted(await submitCancellationRequest(reference, { reason: trimmed }));
      preview.reload(); // now reads "request pending"
    } catch (error) {
      if (getBackendErrorDetails(error).code === undefined && isBadRequest(error)) {
        setFieldError("Please check your reason: it may be blank or too long.");
      } else {
        setFormError(accountErrorMessage(error, "We couldn’t send your request.", NOT_FOUND));
      }
      if (isConflict(error)) preview.reload(); // the backend's view has changed
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const data = preview.data;

  return (
    <AccountPage
      heading="Cancel"
      headingSerif="booking."
      intro={`Booking ${reference}. Review what the cancellation means before sending a request.`}
    >
      <div className="max-w-[760px]">
        {submitted ? (
          <RequestSent request={submitted} />
        ) : preview.loading && !data ? (
          <Loading label="Checking whether this booking can be cancelled" />
        ) : !data ? (
          <Notice alert>
            {accountErrorMessage(
              preview.error,
              "We couldn’t check this booking just now.",
              NOT_FOUND,
            )}{" "}
            <button type="button" className={textLinkClass} onClick={preview.reload}>
              Try again
            </button>
          </Notice>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-[12px]">
              <StatusPill tone={data.can_request ? "positive" : "negative"}>
                {data.can_request ? "Cancellation can be requested" : "Cancellation unavailable"}
              </StatusPill>
              <span className="text-[14px] text-[#4a4f55]">
                {formatLeadTime(data.minutes_before_departure)}
              </span>
            </div>

            {!data.can_request && data.blocked_reason && (
              <Notice alert>
                {BLOCKED_REASON[data.blocked_reason]}{" "}
                {data.blocked_reason === "request_pending" && (
                  <Link href={userRoutes.accountCancellations} className={textLinkClass}>
                    See your cancellation requests
                  </Link>
                )}
              </Notice>
            )}

            <div className="mt-[40px]">
              <SectionTitle>Payments and refunds</SectionTitle>
              <SummaryRows
                rows={[
                  { label: "Paid", value: money(data.paid_amount, data.currency) },
                  { label: "Already refunded", value: money(data.refunded_amount, data.currency) },
                  {
                    label: "Refund on its way",
                    value: money(data.refund_pending_amount, data.currency),
                  },
                  {
                    label: "Most that could still be refunded",
                    value: money(data.refundable_amount, data.currency),
                    strong: true,
                  },
                ]}
              />
              <div className="mt-[20px]">
                <DetailGrid
                  items={[
                    {
                      label: "Refund method",
                      value: data.refund_channel
                        ? REFUND_CHANNEL[data.refund_channel]
                        : "Nothing has been paid",
                    },
                    {
                      label: "Refund under the policy",
                      value:
                        data.policy_refund === null
                          ? "Decided by our team when they review your request"
                          : money(data.policy_refund, data.currency),
                    },
                  ]}
                />
              </div>
            </div>

            <div className="mt-[40px]">
              <SectionTitle>Cancellation policy</SectionTitle>
              <p className="mt-[12px] text-[15px] leading-[24px] whitespace-pre-line text-[#4a4f55]">
                {data.cancellation_summary ??
                  "The cancellation policy hasn’t been published yet. Our concierge can tell you more."}
              </p>
            </div>

            {data.can_request && (
              <form onSubmit={handleSubmit} noValidate className="mt-[40px] grid gap-[16px]">
                <SectionTitle>Request a cancellation</SectionTitle>
                <div>
                  <label htmlFor="cancel-reason" className={labelClass}>
                    Why would you like to cancel?
                  </label>
                  <textarea
                    id="cancel-reason"
                    rows={5}
                    value={reason}
                    maxLength={CANCELLATION_REASON_MAX_LENGTH}
                    disabled={submitting}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby="cancel-reason-hint"
                    onChange={(event) => {
                      setReason(event.currentTarget.value);
                      setFieldError(null);
                    }}
                    className={`${inputClass} mt-[12px] h-auto py-[14px]`}
                  />
                  <p id="cancel-reason-hint" className="mt-[8px] text-[13px] text-[#7a7f85]">
                    {reason.length} / {CANCELLATION_REASON_MAX_LENGTH}
                  </p>
                  {fieldError && (
                    <p role="alert" className={fieldErrorClass}>
                      {fieldError}
                    </p>
                  )}
                </div>
                {formError && <Notice alert>{formError}</Notice>}
                <p className="text-[14px] leading-[21px] text-[#4a4f55]">
                  Sending a request doesn’t cancel your booking yet. Our team reviews it and decides
                  the refund; you’ll see the decision on your cancellation requests.
                </p>
                <div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={primaryButtonClass}
                    style={primaryButtonStyle}
                  >
                    {submitting ? "Sending your request…" : "Send cancellation request"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </AccountPage>
  );
}

const money = (amount: number, currency: string) => formatMinorUnits(amount, currency) ?? "";

const isBadRequest = (error: unknown) => isApiError(error) && error.status === 400;

function RequestSent({ request }: { request: CancellationRequest }) {
  const status = REQUEST_STATUS[request.status];
  return (
    <div role="status">
      <StatusPill tone={status.tone}>{status.label}</StatusPill>
      <p className="mt-[20px] text-[22px] leading-[30px]">Your cancellation request has been sent.</p>
      <p className="mt-[8px] text-[15px] leading-[24px] text-[#4a4f55]">
        Your booking stays as it is until our team decides. We’ll let you know the outcome.
      </p>
      <div className="mt-[28px]">
        <DetailGrid
          items={[
            { label: "Request reference", value: request.id },
            { label: "Booking", value: request.booking_reference },
            { label: "Requested", value: formatDateTime(request.requested_at) },
            ...(request.refund_decision
              ? [{ label: "Refund decision", value: REFUND_DECISION[request.refund_decision] }]
              : []),
            ...(request.refund_amount !== null
              ? [{ label: "Refund amount", value: money(request.refund_amount, request.currency) }]
              : []),
          ]}
        />
      </div>
      <Link
        href={userRoutes.accountCancellations}
        className={`${primaryButtonClass} mt-[28px]`}
        style={primaryButtonStyle}
      >
        View your cancellation requests
      </Link>
    </div>
  );
}
