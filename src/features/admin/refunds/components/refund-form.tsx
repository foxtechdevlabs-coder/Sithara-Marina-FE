"use client";

import type { Route } from "next";
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
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  DetailList,
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import {
  marinaToday,
  parseRupees,
  rupeesInput,
} from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { rupees } from "@/features/admin/reports/utils/report-format";
import { cx } from "@/lib/cx";
import { addBookingNote } from "@/services/admin/bookings.service";
import {
  createRefund,
  getPayment,
  newIdempotencyKey,
  type PaymentDetail,
} from "@/services/admin/payments.service";

import { moneyErrorMessage, paymentReference } from "../utils/money-format";
import { DARK_STYLE } from "./payment-detail";

type Mode = "partial" | "full";

/** Refund a payment: "A refund, carefully reviewed." (A20) then "Check the refund, once more." (A40). */
export function RefundForm({ paymentId }: { paymentId: string }) {
  const payment = useAdminQuery((signal) => getPayment(paymentId, signal), `payment:${paymentId}`);
  if (!payment.data) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A refund, carefully reviewed." />
        <div className="mt-[24px]">
          <LoadState
            loading={payment.loading}
            error={
              payment.error
                ? `Couldn't load the payment. ${moneyErrorMessage(payment.error)}`
                : undefined
            }
            onRetry={payment.reload}
            label="Loading payment"
          />
        </div>
      </div>
    );
  }
  const p = payment.data;
  if (p.refundable_amount <= 0) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A refund, carefully reviewed." />
        <p className="mt-[24px] text-[14px]" style={{ color: BODY }}>
          {p.status === "succeeded"
            ? "This payment has nothing left to refund."
            : "Only a captured payment can be refunded."}
        </p>
        <Link
          href={adminRoutes.refundPayment(p.id)}
          className={cx(smallOutline, "mt-[18px] w-fit")}
          style={OUTLINE_STYLE}
        >
          Back to payment
        </Link>
      </div>
    );
  }
  return <Form payment={p} onStale={payment.reload} />;
}

function Form({ payment: p, onStale }: { payment: PaymentDetail; onStale: () => void }) {
  const router = useRouter();
  const today = marinaToday();
  const offline = p.method !== "gateway";
  const previously = p.refunded_amount + p.refund_pending_amount;
  const [mode, setMode] = useState<Mode>("partial");
  const [amountText, setAmountText] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [handedBack, setHandedBack] = useState(false);
  const [handedOn, setHandedOn] = useState(today);
  const [handedRef, setHandedRef] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  // One key per reviewed request: a repeated click or a lost answer can't refund twice.
  const [key, setKey] = useState(newIdempotencyKey);

  const amount = mode === "full" ? p.refundable_amount : parseRupees(amountText);
  const errors: { amount?: string; reason?: string; handedOn?: string } = {};
  if (submitted) {
    if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Enter an amount more than ₹ 0.";
    else if (amount > p.refundable_amount)
      errors.amount = `The refundable balance is ${rupees(p.refundable_amount)}.`;
    if (!reason.trim()) errors.reason = "Enter the reason for the refund.";
    if (offline && handedBack && (!handedOn || handedOn > today))
      errors.handedOn = "Enter a date that isn’t in the future.";
  }
  const valid =
    Number.isFinite(amount) &&
    amount > 0 &&
    amount <= p.refundable_amount &&
    Boolean(reason.trim()) &&
    !(offline && handedBack && (!handedOn || handedOn > today));
  const kind = amount === p.refundable_amount && previously === 0 ? "Full" : "Partial";

  function review(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setFailure("");
    if (!valid) return;
    setConfirming(true);
    window.scrollTo({ top: 0 });
  }

  function backToForm() {
    setConfirming(false);
    setKey(newIdempotencyKey()); // the details may change: a new request
  }

  async function confirm() {
    setBusy(true);
    setFailure("");
    try {
      await createRefund(
        p.booking.id,
        {
          amount,
          reason: reason.trim(),
          payment_id: p.id,
          ...(offline && handedBack
            ? {
                completed: {
                  refunded_on: handedOn,
                  ...(handedRef.trim() ? { reference: handedRef.trim() } : {}),
                },
              }
            : {}),
        },
        key,
      );
      let notice = offline && handedBack ? "refund-recorded" : "refund-requested";
      if (note.trim()) {
        try {
          await addBookingNote(
            p.booking.id,
            `Refund ${rupees(amount)} on payment ${paymentReference(p)}: ${note.trim()}`,
          );
        } catch {
          notice = "note-failed";
        }
      }
      router.push(`${adminRoutes.refundPayment(p.id)}?notice=${notice}` as Route);
    } catch (err) {
      setFailure(moneyErrorMessage(err));
      setBusy(false);
      onStale();
    }
  }

  const subtitle = `Payment ${paymentReference(p)} · Booking ${p.booking.reference}`;

  if (confirming) {
    return (
      <div className={pagePadding}>
        <PageHeader
          title="Check the refund, once more."
          subtitle={`${kind} refund for ${paymentReference(p)}`}
        />
        <DetailList
          className="mt-[24px] lg:mt-[30px] lg:max-w-[880px]"
          items={[
            ["Refund amount", rupees(amount)],
            ["Remaining balance after refund", rupees(p.refundable_amount - amount)],
            ["Reason", reason.trim()],
            ...(offline
              ? ([
                  [
                    "Handed back",
                    handedBack
                      ? `${new Date(`${handedOn}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}${handedRef.trim() ? ` · ${handedRef.trim()}` : ""}`
                      : "Not yet: record it when the money is returned",
                  ],
                ] as [string, string][])
              : []),
          ]}
        />
        <InfoPanel title="Refund processing" className="mt-[24px] lg:max-w-[880px]">
          {offline
            ? "Cash and bank transfer refunds are handed back by staff. Until it is recorded as handed back, the refund stays processing."
            : "The provider result is verified before the refund is marked complete. A pending result must be checked before retrying."}
        </InfoPanel>
        {failure && (
          <Notice tone="error" className="mt-[20px] lg:max-w-[880px]">
            {failure}
          </Notice>
        )}
        <div className="mt-[24px] flex flex-wrap gap-[14px]">
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirm()}
            className={cx(smallPrimary, "min-w-[160px]")}
            style={DARK_STYLE}
          >
            {busy ? "Sending…" : "Confirm refund request"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={backToForm}
            className={cx(smallOutline, "min-w-[150px]")}
            style={OUTLINE_STYLE}
          >
            Back to refund
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={pagePadding}>
      <PageHeader title="A refund, carefully reviewed." subtitle={subtitle} />
      <DetailList
        className="mt-[24px] lg:mt-[30px] lg:max-w-[880px]"
        items={[
          ["Captured amount", rupees(p.amount)],
          ["Previously refunded", rupees(previously)],
          ["Refundable balance", rupees(p.refundable_amount)],
        ]}
      />

      <form onSubmit={review} noValidate className="mt-[26px]">
        <div role="tablist" aria-label="Refund type" className="flex flex-wrap gap-[10px]">
          {(["partial", "full"] as const).map((m) => {
            const on = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setMode(m);
                  if (m === "full") setAmountText(rupeesInput(p.refundable_amount));
                }}
                className="flex h-[40px] min-w-[120px] items-center justify-center border px-[16px] text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a]"
                style={
                  on
                    ? { backgroundColor: NAVY, color: "white", borderColor: NAVY }
                    : { borderColor: INK, backgroundColor: "white" }
                }
              >
                {m === "partial" ? "Partial refund" : "Full refund"}
              </button>
            );
          })}
        </div>

        <div className="mt-[24px] grid gap-x-[18px] gap-y-[22px] lg:max-w-[700px] lg:grid-cols-2">
          <div>
            <Label htmlFor="refund-amount" required>
              Refund amount
            </Label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-[16px] -translate-y-1/2 text-[14px]"
              >
                ₹
              </span>
              <input
                id="refund-amount"
                inputMode="decimal"
                value={mode === "full" ? rupeesInput(p.refundable_amount) : amountText}
                readOnly={mode === "full"}
                onChange={(e) => setAmountText(e.currentTarget.value)}
                placeholder="0"
                className={cx(input, "pl-[32px]", mode === "full" && "bg-[#fbfaf8]")}
                {...errorProps("refund-amount", errors.amount)}
              />
            </div>
            <FieldError id="refund-amount" message={errors.amount} />
          </div>
          <div>
            <Label htmlFor="refund-reason" required>
              Reason
            </Label>
            <input
              id="refund-reason"
              value={reason}
              maxLength={1000}
              placeholder="e.g. Approved adjustment"
              onChange={(e) => setReason(e.currentTarget.value)}
              className={input}
              {...errorProps("refund-reason", errors.reason)}
            />
            <FieldError id="refund-reason" message={errors.reason} />
          </div>
          <div>
            <Label htmlFor="refund-note">Internal note</Label>
            <input
              id="refund-note"
              value={note}
              maxLength={1000}
              placeholder="Include the policy or authorisation basis."
              onChange={(e) => setNote(e.currentTarget.value)}
              className={input}
            />
            <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
              Added to the booking’s notes.
            </p>
          </div>
        </div>

        {offline && (
          <div className="mt-[22px] lg:max-w-[700px]">
            <label className="flex items-center gap-[10px] text-[13px]">
              <input
                type="checkbox"
                checked={handedBack}
                onChange={(e) => setHandedBack(e.currentTarget.checked)}
                className="size-[16px] accent-[#0d1b2a]"
              />
              The money has already been handed back
            </label>
            {handedBack && (
              <div className="mt-[14px] grid gap-x-[18px] gap-y-[18px] lg:grid-cols-2">
                <div>
                  <Label htmlFor="refund-handed-on" required>
                    Handed back on
                  </Label>
                  <input
                    id="refund-handed-on"
                    type="date"
                    value={handedOn}
                    max={today}
                    onChange={(e) => setHandedOn(e.currentTarget.value)}
                    className={input}
                    {...errorProps("refund-handed-on", errors.handedOn)}
                  />
                  <FieldError id="refund-handed-on" message={errors.handedOn} />
                </div>
                <div>
                  <Label htmlFor="refund-handed-ref">Reference</Label>
                  <input
                    id="refund-handed-ref"
                    value={handedRef}
                    maxLength={100}
                    placeholder="e.g. Cash receipt 0042"
                    onChange={(e) => setHandedRef(e.currentTarget.value)}
                    className={input}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <InfoPanel title="Verify before confirming" className="mt-[24px] lg:max-w-[880px]">
          {offline
            ? "This payment was cash or bank transfer, so staff hand the money back. The amount cannot exceed the remaining refundable balance."
            : "Return funds through the original payment method where supported. The amount cannot exceed the remaining refundable balance. The refund remains processing until verified."}
        </InfoPanel>

        {failure && (
          <Notice tone="error" className="mt-[20px] lg:max-w-[880px]">
            {failure}
          </Notice>
        )}

        <div className="mt-[24px] flex flex-wrap gap-[14px]">
          <button type="submit" className={cx(smallPrimary, "min-w-[150px]")} style={DARK_STYLE}>
            Review refund →
          </button>
          <Link
            href={adminRoutes.refundPayment(p.id)}
            className={cx(smallOutline, "min-w-[150px]")}
            style={OUTLINE_STYLE}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
