"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { BODY, NAVY } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import {
  approveCancellationRequest,
  getCancellationRequest,
  rejectCancellationRequest,
  type CancellationRequestDetail as Detail,
} from "@/services/admin/cancellation-requests.service";
import { listPayments } from "@/services/admin/payments.service";
import { isApiError } from "@/services/http/api-error";

import {
  bookingErrorMessage,
  bookingStatusLabel,
  formatInstant,
  formatRupees,
  parseRupees,
} from "../utils/booking-format";
import {
  DetailList,
  InfoPanel,
  PageHeader,
  pagePadding,
  SegmentTabs,
  smallOutline,
  smallPrimary,
} from "./booking-ui";
import { charterText, requestStatusLabel } from "./cancellation-requests";

/** "2 days 4 hours", "45 minutes", from minutes. */
export function durationWords(minutes: number): string {
  const m = Math.abs(Math.round(minutes));
  const days = Math.floor(m / 1440);
  const hours = Math.floor((m % 1440) / 60);
  const mins = m % 60;
  const parts = [
    days ? `${days} day${days === 1 ? "" : "s"}` : "",
    hours ? `${hours} hour${hours === 1 ? "" : "s"}` : "",
    !days && mins ? `${mins} minute${mins === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return parts.join(" ") || "0 minutes";
}

const REFUND_LABEL: Record<string, string> = {
  full: "Full refund",
  partial: "Partial refund",
  none: "No refund",
};

/** A message for a failed decision. */
function decisionError(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "CANCELLATION_REQUEST_NOT_PENDING")
      return "This request was already decided, perhaps by someone else. The page has been refreshed.";
    if (error.code === "INVALID_REFUND_AMOUNT")
      return "A partial refund must be more than ₹ 0 and less than what was paid.";
    if (error.code === "CANCELLATION_REQUEST_NOT_FOUND") return "This request no longer exists.";
  }
  return bookingErrorMessage(error);
}

/** One cancellation request: the booking, the refund preview, and the decision. */
export function CancellationRequestDetail({ requestId }: { requestId: string }) {
  const request = useAdminQuery(
    (signal) => getCancellationRequest(requestId, signal),
    `cancel-request:${requestId}`,
  );
  if (!request.data) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A change of plans." />
        <div className="mt-[24px]">
          <LoadState
            loading={request.loading}
            error={
              request.error
                ? `Couldn't load the request. ${decisionError(request.error)}`
                : undefined
            }
            onRetry={request.reload}
            label="Loading request"
          />
        </div>
      </div>
    );
  }
  return <RequestView request={request.data} onChanged={request.reload} />;
}

function RequestView({ request: r, onChanged }: { request: Detail; onChanged: () => void }) {
  const p = r.refund_preview;
  const b = r.booking;
  const pending = r.status === "pending";
  const nothingPaid = p.paid_amount <= 0;

  return (
    <div className={pagePadding}>
      <PageHeader
        title="A change of plans."
        subtitle={
          <>
            Cancellation request for{" "}
            <Link href={adminRoutes.booking(b.id)} className="underline underline-offset-2">
              {b.reference}
            </Link>{" "}
            · {requestStatusLabel(r.status)}
          </>
        }
      />

      <div className="mt-[24px] border border-[#dcdad5] bg-white px-[18px] py-[18px] lg:max-w-[880px] lg:px-[22px]">
        <p className="text-[20px] leading-[26px] break-words">
          {b.yacht_name} · {charterText(b)}
        </p>
        <p className="mt-[6px] text-[12px] break-words" style={{ color: BODY }}>
          {b.contact_name} · {b.contact_email}
          {b.contact_phone ? ` · ${b.contact_phone}` : ""} · booking{" "}
          {bookingStatusLabel(b.status).toLowerCase()} · total {formatRupees(b.total_amount)}
        </p>
      </div>

      <DetailList
        className="mt-[24px] lg:max-w-[880px]"
        items={[
          ["Customer’s reason", r.reason || "No reason given"],
          [
            "Requested",
            `${formatInstant(r.requested_at)}${r.requested_by ? ` by ${r.requested_by.name}` : ""} — ${durationWords(p.minutes_before_departure_at_request)} ${p.minutes_before_departure_at_request >= 0 ? "before" : "after"} departure`,
          ],
          [
            "Departure",
            p.minutes_before_departure_now >= 0
              ? `In ${durationWords(p.minutes_before_departure_now)}`
              : `Started ${durationWords(p.minutes_before_departure_now)} ago`,
          ],
          ["Paid", formatRupees(p.paid_amount)],
          ...(p.refunded_amount
            ? ([["Already refunded", formatRupees(p.refunded_amount)]] as [string, string][])
            : []),
          ...(p.refund_pending_amount
            ? ([["Refund processing", formatRupees(p.refund_pending_amount)]] as [string, string][])
            : []),
          ["Refundable", formatRupees(p.refundable_amount)],
          ...(p.refund_channel
            ? ([
                [
                  "Refunds go back",
                  p.refund_channel === "gateway"
                    ? "Through the payment provider"
                    : "By hand (cash or bank transfer)",
                ],
              ] as [string, string][])
            : []),
        ]}
      />

      <InfoPanel title="Cancellation policy" className="mt-[22px] lg:max-w-[880px]">
        {p.cancellation_summary || "No cancellation policy text is set in Settings."}
        {p.policy_refund !== null
          ? ` The policy suggests refunding ${formatRupees(p.policy_refund)}.`
          : " There is no automatic policy refund yet: decide the amount yourself."}
      </InfoPanel>

      {pending ? (
        <DecisionForm request={r} nothingPaid={nothingPaid} onDecided={onChanged} />
      ) : (
        <Decided request={r} />
      )}
    </div>
  );
}

function Decided({ request: r }: { request: Detail }) {
  const approvedWithRefund = r.status === "approved" && (r.refund_amount ?? 0) > 0;
  // The captured payment to refund, for a direct link.
  const payments = useAdminQuery(
    (signal) =>
      approvedWithRefund
        ? listPayments({ booking_id: r.booking.id, status: "succeeded", limit: 20 }, signal)
        : Promise.resolve(null),
    `cancel-request-payments:${r.id}:${approvedWithRefund}`,
  );
  const refundable = payments.data?.items.find((x) => x.refundable_amount > 0);

  return (
    <section aria-labelledby="decision" className="mt-[26px] lg:max-w-[880px]">
      <h2 id="decision" className="text-[20px] leading-[26px]">
        {r.status === "approved" ? "Approved" : "Declined"}
      </h2>
      <DetailList
        className="mt-[12px]"
        items={[
          [
            "Decided",
            `${r.decided_at ? formatInstant(r.decided_at) : "—"}${r.decided_by ? ` by ${r.decided_by.name}` : ""}`,
          ],
          ...(r.status === "approved"
            ? ([
                [
                  "Refund decision",
                  `${REFUND_LABEL[r.refund_decision ?? ""] ?? r.refund_decision ?? "—"}${r.refund_amount ? ` · ${formatRupees(r.refund_amount)}` : ""}`,
                ],
              ] as [string, string][])
            : []),
          ["Reason shown to the customer", r.decision_reason || "—"],
        ]}
      />
      {approvedWithRefund && (
        <Notice className="mt-[16px]">
          The refund of {formatRupees(r.refund_amount!)} is a decision, not a payment yet.{" "}
          {refundable ? (
            <Link
              href={adminRoutes.refundNew(refundable.id)}
              className="underline underline-offset-2"
            >
              Refund the payment now
            </Link>
          ) : (
            <Link href={adminRoutes.booking(r.booking.id)} className="underline underline-offset-2">
              Open the booking’s payments
            </Link>
          )}
          .
        </Notice>
      )}
      <div className="mt-[20px] flex flex-wrap gap-[14px]">
        <Link
          href={adminRoutes.cancellationRequests}
          className={cx(smallOutline, "min-w-[150px]")}
          style={OUTLINE_STYLE}
        >
          Back to requests
        </Link>
        <Link
          href={adminRoutes.booking(r.booking.id)}
          className={cx(smallOutline, "min-w-[150px]")}
          style={OUTLINE_STYLE}
        >
          Open booking
        </Link>
      </div>
    </section>
  );
}

function DecisionForm({
  request: r,
  nothingPaid,
  onDecided,
}: {
  request: Detail;
  nothingPaid: boolean;
  onDecided: () => void;
}) {
  const p = r.refund_preview;
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [refund, setRefund] = useState<"full" | "partial" | "none">(nothingPaid ? "none" : "full");
  const [amountText, setAmountText] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  const amount = parseRupees(amountText);
  const errors: { amount?: string; reason?: string } = {};
  if (submitted) {
    if (action === "approve" && refund === "partial") {
      if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Enter an amount more than ₹ 0.";
      else if (amount >= p.paid_amount)
        errors.amount = `A partial refund must be less than what was paid (${formatRupees(p.paid_amount)}); choose a full refund instead.`;
    }
    if (action === "reject" && !reason.trim())
      errors.reason = "Tell the customer why the request is declined.";
    if (reason.length > 1000) errors.reason = "Keep it to 1,000 characters.";
  }
  const valid =
    reason.length <= 1000 &&
    (action === "reject"
      ? Boolean(reason.trim())
      : refund !== "partial" || (Number.isFinite(amount) && amount > 0 && amount < p.paid_amount));

  const refundText =
    refund === "full"
      ? `Full refund · ${formatRupees(p.paid_amount)}`
      : refund === "partial"
        ? `Partial refund · ${Number.isFinite(amount) ? formatRupees(amount) : "—"}`
        : "No refund";

  function review(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setFailure("");
    if (valid) setConfirming(true);
  }

  async function decide() {
    setBusy(true);
    setFailure("");
    try {
      if (action === "approve")
        await approveCancellationRequest(r.id, {
          refund_decision: refund,
          ...(refund === "partial" ? { refund_amount: amount } : {}),
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      else await rejectCancellationRequest(r.id, reason.trim());
      onDecided();
    } catch (err) {
      setFailure(decisionError(err));
      setBusy(false);
      setConfirming(false);
      if (isApiError(err) && err.code === "CANCELLATION_REQUEST_NOT_PENDING") onDecided();
    }
  }

  return (
    <form
      onSubmit={review}
      noValidate
      aria-labelledby="decide"
      className="mt-[28px] lg:max-w-[880px]"
    >
      <h2 id="decide" className="text-[20px] leading-[26px]">
        Decide
      </h2>
      <div className="mt-[12px]">
        <SegmentTabs
          label="Decision"
          value={action}
          onChange={(v) => {
            setAction(v);
            setConfirming(false);
          }}
          options={[
            { value: "approve", label: "Approve" },
            { value: "reject", label: "Decline" },
          ]}
        />
      </div>

      {action === "approve" && (
        <fieldset className="mt-[18px]">
          <legend className="text-[12px]" style={{ color: BODY }}>
            Refund decision
          </legend>
          <div className="mt-[8px] flex flex-wrap gap-[10px]">
            {(["full", "partial", "none"] as const).map((k) => {
              const off = nothingPaid && k !== "none";
              const on = refund === k;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={off}
                  aria-pressed={on}
                  onClick={() => {
                    setRefund(k);
                    setConfirming(false);
                  }}
                  className="flex h-[40px] min-w-[120px] items-center justify-center border px-[14px] text-[11px] disabled:cursor-not-allowed disabled:opacity-40"
                  style={
                    on
                      ? { backgroundColor: NAVY, color: "white", borderColor: NAVY }
                      : { borderColor: "#0d1b2a", backgroundColor: "white" }
                  }
                >
                  {REFUND_LABEL[k]}
                </button>
              );
            })}
          </div>
          {nothingPaid && (
            <p className="mt-[8px] text-[11px]" style={{ color: BODY }}>
              Nothing was paid on this booking, so there is nothing to refund.
            </p>
          )}
          {refund === "partial" && (
            <div className="mt-[14px] max-w-[340px]">
              <Label htmlFor="cr-amount" required hint={`less than ${formatRupees(p.paid_amount)}`}>
                Refund amount (₹)
              </Label>
              <input
                id="cr-amount"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.currentTarget.value)}
                className={input}
                {...errorProps("cr-amount", errors.amount)}
              />
              <FieldError id="cr-amount" message={errors.amount} />
            </div>
          )}
        </fieldset>
      )}

      <div className="mt-[18px] max-w-[580px]">
        <Label htmlFor="cr-reason" required={action === "reject"} hint="shown to the customer">
          {action === "approve" ? "Note to the customer" : "Reason for declining"}
        </Label>
        <textarea
          id="cr-reason"
          value={reason}
          rows={3}
          maxLength={1000}
          placeholder={
            action === "approve"
              ? "e.g. Within the free cancellation period"
              : "e.g. Inside 24 hours of departure"
          }
          onChange={(e) => setReason(e.currentTarget.value)}
          className={cx(input, "h-auto py-[12px] leading-[20px]")}
          {...errorProps("cr-reason", errors.reason)}
        />
        <FieldError id="cr-reason" message={errors.reason} />
      </div>

      {confirming && (
        <div
          role="alertdialog"
          aria-labelledby="cr-confirm"
          className="mt-[18px] border border-[#0d1b2a] bg-white px-[18px] py-[16px]"
        >
          <p id="cr-confirm" className="text-[14px]">
            {action === "approve"
              ? `Cancel ${r.booking.reference} with ${refundText.toLowerCase()}?`
              : `Decline the request? ${r.booking.reference} stays booked.`}
          </p>
          <p className="mt-[6px] text-[12px]" style={{ color: BODY }}>
            {action === "approve"
              ? "The booking is cancelled and its slot released. The refund decision is recorded; pay it afterwards on Payments & refunds. The customer is told."
              : "The customer sees your reason."}
          </p>
          <div className="mt-[12px] flex flex-wrap gap-[10px]">
            <button
              type="button"
              disabled={busy}
              onClick={() => void decide()}
              className={smallPrimary}
              style={PRIMARY_STYLE}
            >
              {busy
                ? "Saving…"
                : action === "approve"
                  ? "Approve and cancel booking"
                  : "Decline request"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className={smallOutline}
              style={OUTLINE_STYLE}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {failure && (
        <Notice tone="error" className="mt-[16px]">
          {failure}
        </Notice>
      )}

      {!confirming && (
        <div className="mt-[20px] flex flex-wrap gap-[14px]">
          <button type="submit" className={cx(smallPrimary, "min-w-[150px]")} style={PRIMARY_STYLE}>
            {action === "approve" ? "Review approval" : "Review decline"}
          </button>
          <Link
            href={adminRoutes.cancellationRequests}
            className={cx(smallOutline, "min-w-[150px]")}
            style={OUTLINE_STYLE}
          >
            Back to requests
          </Link>
        </div>
      )}
    </form>
  );
}
