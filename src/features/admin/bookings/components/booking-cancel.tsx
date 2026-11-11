"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BODY, INK, NAVY } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import {
  cancelBooking,
  getBooking,
  type BookingDetail,
  type CancelInput,
} from "@/services/admin/bookings.service";

import {
  bookingErrorMessage,
  bookingStatusLabel,
  formatInstant,
  formatRupees,
  longDate,
  parseRupees,
  slotText,
} from "../utils/booking-format";
import { Card, formGrid, InfoPanel, PageHeader, pagePadding, smallOutline } from "./booking-ui";

type Decision = "approve" | "keep";

/**
 * Cancellation: "Review a change of plans." (admin Figma A13). Staff record
 * the decision, the reason and the refund owed; POST …/cancel saves it. The
 * refund itself is paid on Payments & refunds.
 */
export function BookingCancel({ bookingId }: { bookingId: string }) {
  const booking = useAdminQuery((signal) => getBooking(bookingId, signal), `booking:${bookingId}`);
  if (!booking.data) {
    return (
      <div className={pagePadding}>
        <LoadState
          loading={booking.loading}
          error={
            booking.error
              ? `Couldn't load the booking. ${bookingErrorMessage(booking.error)}`
              : undefined
          }
          onRetry={booking.reload}
          label="Loading booking"
        />
      </div>
    );
  }
  const b = booking.data;
  if (b.status !== "pending_payment" && b.status !== "confirmed") {
    return (
      <div className={pagePadding}>
        <PageHeader title="Review a change of plans." />
        <p className="mt-[24px] text-[14px]" style={{ color: BODY }}>
          This booking is {bookingStatusLabel(b.status).toLowerCase()}, so it can’t be cancelled.
        </p>
        <Link
          href={adminRoutes.booking(b.id)}
          className={cx(smallOutline, "mt-[18px] w-fit")}
          style={OUTLINE_STYLE}
        >
          Back to booking
        </Link>
      </div>
    );
  }
  return <CancelForm booking={b} />;
}

function CancelForm({ booking: b }: { booking: BookingDetail }) {
  const router = useRouter();
  const paid = b.payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount, 0);
  const [decision, setDecision] = useState<Decision>("approve");
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState<CancelInput["refund_decision"]>(paid ? "full" : "none");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const name = b.customer?.full_name ?? b.contact.full_name;

  const refundPaise = refund === "full" ? paid : refund === "partial" ? parseRupees(amount) : 0;
  const outcome =
    decision === "keep"
      ? `${b.reference} stays ${bookingStatusLabel(b.status).toLowerCase()}. Nothing is changed or sent.`
      : `${b.reference} on ${longDate(b.date)} is cancelled and the slot is freed. ` +
        (refundPaise > 0 && !Number.isNaN(refundPaise)
          ? `A refund of ${formatRupees(refundPaise)} is recorded for Payments & refunds to pay.`
          : "No refund is due.");

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (decision === "keep") {
      router.push(adminRoutes.booking(b.id));
      return;
    }
    const next: Record<string, string> = {};
    if (!reason.trim()) next.reason = "Give the reason for the decision.";
    if (refund === "partial") {
      const paise = parseRupees(amount);
      if (Number.isNaN(paise) || paise <= 0 || paise >= paid)
        next.amount = `Enter an amount above ₹ 0 and below ${formatRupees(paid)}.`;
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setFailure("");
    try {
      await cancelBooking(b.id, {
        reason: reason.trim(),
        refund_decision: refund,
        ...(refund === "partial" ? { refund_amount: parseRupees(amount) } : {}),
      });
      router.push(adminRoutes.booking(b.id));
    } catch (err) {
      setFailure(bookingErrorMessage(err));
      setBusy(false);
    }
  }

  const refundOptions = paid
    ? [
        { value: "full", label: `Full refund · ${formatRupees(paid)}` },
        { value: "partial", label: "Partial refund" },
        { value: "none", label: "No refund" },
      ]
    : [{ value: "none", label: "No refund (nothing was paid)" }];

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Review a change of plans."
        subtitle={`Cancellation for booking ${b.reference}`}
      />

      <form onSubmit={confirm} noValidate>
        <Card title="Customer request" className="mt-[24px] lg:mt-[30px] lg:max-w-[880px]">
          {name} · {b.contact.email}
          <br />
          {b.yacht.name} · {longDate(b.date).replace(/ \d{4}$/, "")} · {slotText(b)}
        </Card>

        <InfoPanel title="Applicable terms" className="mt-[20px] lg:max-w-[880px]">
          Review the policy accepted with this booking and the request time. Record the outcome and
          any eligible refund separately.
          <span className="mt-[6px] block" style={{ color: BODY }}>
            {b.terms_accepted_at
              ? `Terms accepted ${formatInstant(b.terms_accepted_at)}. `
              : "Office booking: no online terms acceptance. "}
            Paid so far: {formatRupees(paid)}.
          </span>
        </InfoPanel>

        <div className={cx(formGrid, "mt-[24px]")}>
          <div>
            <Label htmlFor="cancel-decision">Decision</Label>
            <SelectBox
              id="cancel-decision"
              value={decision}
              onChange={(v) => setDecision(v as Decision)}
              options={[
                { value: "approve", label: "Approve cancellation" },
                { value: "keep", label: "Keep booking" },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="cancel-reason" required={decision === "approve"}>
              Reason for decision
            </Label>
            <input
              id="cancel-reason"
              value={reason}
              maxLength={1000}
              disabled={decision === "keep"}
              onChange={(e) => setReason(e.currentTarget.value)}
              placeholder="According to the booking policy"
              className={input}
              {...errorProps("cancel-reason", errors.reason)}
            />
            <FieldError id="cancel-reason" message={errors.reason} />
          </div>
          {decision === "approve" && (
            <>
              <div>
                <Label htmlFor="cancel-refund" required>
                  Refund
                </Label>
                <SelectBox
                  id="cancel-refund"
                  value={refund}
                  onChange={(v) => setRefund(v as CancelInput["refund_decision"])}
                  options={refundOptions}
                />
              </div>
              {refund === "partial" && (
                <div>
                  <Label htmlFor="cancel-amount" required>
                    Refund amount (₹)
                  </Label>
                  <input
                    id="cancel-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.currentTarget.value)}
                    className={input}
                    {...errorProps("cancel-amount", errors.amount)}
                  />
                  <FieldError id="cancel-amount" message={errors.amount} />
                </div>
              )}
            </>
          )}
          <div className="lg:col-span-2 lg:max-w-[281px]">
            <Label as="p">Customer notification</Label>
            <p
              aria-live="polite"
              className={`${input} flex h-auto min-h-[52px] items-center py-[12px] leading-[18px]`}
              style={{ color: BODY }}
            >
              {outcome}
            </p>
          </div>
        </div>

        {failure && (
          <Notice tone="error" className="mt-[20px] lg:max-w-[880px]">
            {failure}
          </Notice>
        )}

        <div className="mt-[24px] flex flex-wrap gap-[14px] lg:mt-[30px]">
          <button
            type="submit"
            disabled={busy}
            className="flex h-[44px] items-center justify-center px-[20px] text-[11px] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: NAVY }}
          >
            {busy ? "Cancelling…" : decision === "keep" ? "Keep booking" : "Confirm cancellation"}
          </button>
          <Link
            href={adminRoutes.booking(b.id)}
            className={smallOutline}
            style={{ borderColor: INK }}
          >
            Back to booking
          </Link>
        </div>
        <Link
          href={adminRoutes.booking(b.id)}
          className="mt-[18px] inline-block px-[20px] text-[11px] hover:underline"
        >
          Keep booking / request clarification
        </Link>
      </form>
    </div>
  );
}
