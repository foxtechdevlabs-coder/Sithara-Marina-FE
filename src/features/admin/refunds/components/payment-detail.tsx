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
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  DetailList,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { formatInstant, marinaToday } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { rupees } from "@/features/admin/reports/utils/report-format";
import { cx } from "@/lib/cx";
import {
  getPayment,
  recordRefundResult,
  retryRefund,
  type PaymentDetail as Detail,
  type Refund,
} from "@/services/admin/payments.service";

import {
  exceptionLabel,
  instrumentDetail,
  moneyErrorMessage,
  paymentMethodText,
  paymentReference,
  paymentStatusLabel,
  refundChannelText,
  refundReference,
  refundStatusLabel,
} from "../utils/money-format";

/** Dark buttons of the payments & refunds designs. */
export const DARK_STYLE = { backgroundColor: NAVY, color: "white" };

const dateText = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** A payment with its refunds (GET /admin/payments/{id}). */
export function PaymentDetail({ paymentId, notice }: { paymentId: string; notice?: string }) {
  const payment = useAdminQuery((signal) => getPayment(paymentId, signal), `payment:${paymentId}`);
  if (!payment.data) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A payment, accounted for." />
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
          {Boolean(payment.error) && !payment.loading && (
            <Link
              href={adminRoutes.refunds}
              className={cx(smallOutline, "mt-[18px] w-fit")}
              style={OUTLINE_STYLE}
            >
              Back to payments & refunds
            </Link>
          )}
        </div>
      </div>
    );
  }
  return <PaymentView payment={payment.data} notice={notice} onChange={payment.reload} />;
}

function PaymentView({
  payment: p,
  notice,
  onChange,
}: {
  payment: Detail;
  notice?: string;
  onChange: () => void;
}) {
  const instrument = instrumentDetail(p);
  return (
    <div className={pagePadding}>
      <PageHeader
        title="A payment, accounted for."
        subtitle={
          <>
            Payment {paymentReference(p)} · Booking{" "}
            <Link href={adminRoutes.booking(p.booking.id)} className="underline underline-offset-2">
              {p.booking.reference}
            </Link>{" "}
            · {p.booking.contact_name}
          </>
        }
      />
      {notice === "refund-requested" && (
        <Notice className="mt-[20px] lg:max-w-[880px]">
          Refund requested. It stays processing until the provider confirms it.
        </Notice>
      )}
      {notice === "refund-recorded" && (
        <Notice className="mt-[20px] lg:max-w-[880px]">Refund recorded as handed back.</Notice>
      )}
      {notice === "note-failed" && (
        <Notice tone="error" className="mt-[20px] lg:max-w-[880px]">
          The refund was requested, but the internal note couldn’t be saved. Add it on the booking.
        </Notice>
      )}
      {p.exception_reason && (
        <Notice tone="error" className="mt-[20px] lg:max-w-[880px]">
          Needs review: {exceptionLabel(p.exception_reason)}.
        </Notice>
      )}

      <DetailList
        className="mt-[24px] lg:max-w-[880px]"
        items={[
          ["Amount", rupees(p.amount)],
          ["Status", paymentStatusLabel(p.status)],
          ["Method", paymentMethodText(p)],
          ...(instrument ? ([["Paid with", instrument]] as [string, string][]) : []),
          ...(p.captured_at
            ? ([["Captured", formatInstant(p.captured_at)]] as [string, string][])
            : []),
          ...(p.received_on
            ? ([["Received on", dateText(p.received_on)]] as [string, string][])
            : []),
          ...(p.provider_payment_id
            ? ([["Gateway reference", p.provider_payment_id]] as [string, string][])
            : []),
          ...(p.reference ? ([["Staff reference", p.reference]] as [string, string][]) : []),
          ...(p.failure_description || p.failure_code
            ? ([["Failure", p.failure_description ?? p.failure_code!]] as [string, string][])
            : []),
          ["Refunded", rupees(p.refunded_amount)],
          ...(p.refund_pending_amount
            ? ([["Refund processing", rupees(p.refund_pending_amount)]] as [string, string][])
            : []),
          ["Refundable balance", rupees(p.refundable_amount)],
        ]}
      />

      <div className="mt-[24px] flex flex-wrap gap-[14px]">
        {p.refundable_amount > 0 && (
          <Link
            href={adminRoutes.refundNew(p.id)}
            className={cx(smallPrimary, "min-w-[150px]")}
            style={DARK_STYLE}
          >
            Refund this payment →
          </Link>
        )}
        <Link
          href={adminRoutes.refunds}
          className={cx(smallOutline, "min-w-[150px]")}
          style={OUTLINE_STYLE}
        >
          Back to payments & refunds
        </Link>
      </div>

      <section aria-labelledby="refunds-title" className="mt-[34px] lg:max-w-[880px]">
        <h2 id="refunds-title" className="text-[22px] leading-[28px]">
          Refunds
        </h2>
        {!p.refunds.length ? (
          <p className="mt-[10px] text-[12px]" style={{ color: BODY }}>
            No refunds on this payment.
          </p>
        ) : (
          <ul className="mt-[12px] grid gap-[12px]">
            {[...p.refunds].reverse().map((r) => (
              <RefundCard key={r.id} refund={r} onChange={onChange} />
            ))}
          </ul>
        )}
      </section>

      {p.events.length > 0 && (
        <section aria-labelledby="events-title" className="mt-[30px] lg:max-w-[880px]">
          <h2 id="events-title" className="text-[18px] leading-[24px]">
            Provider events
          </h2>
          <ul className="mt-[10px] text-[12px]">
            {p.events.map((e, i) => (
              <li key={i} className="border-b border-[#ebe9e4] py-[8px]">
                {e.event_type} · {e.result.replace(/_/g, " ")}
                <span className="ml-[6px]" style={{ color: BODY }}>
                  {formatInstant(e.received_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** One refund, with "record the result" for a pending cash / bank refund and "retry" for a failed gateway one. */
function RefundCard({ refund: r, onChange }: { refund: Refund; onChange: () => void }) {
  const [mode, setMode] = useState<"" | "processed" | "failed">("");
  const [date, setDate] = useState(marinaToday());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tried, setTried] = useState(false);
  const canRecord = r.channel === "offline" && r.status === "pending";
  const canRetry = r.channel === "gateway" && r.status === "failed";

  async function record(event: FormEvent) {
    event.preventDefault();
    setTried(true);
    if (mode === "processed" && (!date || date > marinaToday())) return;
    setBusy(true);
    setError("");
    try {
      await recordRefundResult(r.id, {
        status: mode as "processed" | "failed",
        ...(mode === "processed" ? { refunded_on: date } : {}),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onChange();
    } catch (err) {
      setError(moneyErrorMessage(err));
      setBusy(false);
    }
  }

  async function retry() {
    setBusy(true);
    setError("");
    try {
      await retryRefund(r.id);
      onChange();
    } catch (err) {
      setError(moneyErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <li className="border border-[#dcdad5] bg-white px-[16px] py-[16px]">
      <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
        <p className="text-[16px]">
          {rupees(r.amount)} · {refundStatusLabel(r.status)}
        </p>
        <p className="text-[11px] break-all" style={{ color: BODY }}>
          {refundReference(r)}
        </p>
      </div>
      <p className="mt-[6px] text-[12px] leading-[18px]" style={{ color: BODY }}>
        {refundChannelText(r.channel)} · {r.reason}
        {r.approved_by ? ` · approved by ${r.approved_by.name}` : ""} · requested{" "}
        {formatInstant(r.created_at)}
        {r.refunded_on ? ` · handed back ${dateText(r.refunded_on)}` : ""}
        {r.channel === "gateway" && r.attempt > 1 ? ` · attempt ${r.attempt}` : ""}
        {r.failure_description || r.failure_code
          ? ` · failed: ${r.failure_description ?? r.failure_code}`
          : ""}
      </p>

      {error && (
        <Notice tone="error" className="mt-[10px]">
          {error}
        </Notice>
      )}

      {canRetry && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void retry()}
          className={cx(smallOutline, "mt-[12px]")}
          style={OUTLINE_STYLE}
        >
          {busy ? "Retrying…" : "Retry refund"}
        </button>
      )}

      {canRecord && !mode && (
        <div className="mt-[12px] flex flex-wrap gap-[10px]">
          <button
            type="button"
            onClick={() => setMode("processed")}
            className={smallPrimary}
            style={DARK_STYLE}
          >
            Record as handed back
          </button>
          <button
            type="button"
            onClick={() => setMode("failed")}
            className={smallOutline}
            style={OUTLINE_STYLE}
          >
            Mark failed
          </button>
        </div>
      )}

      {canRecord && mode && (
        <form onSubmit={record} noValidate className="mt-[14px] grid gap-[14px] sm:grid-cols-2">
          {mode === "processed" && (
            <div>
              <Label htmlFor={`rf-date-${r.id}`} required>
                Handed back on
              </Label>
              <input
                id={`rf-date-${r.id}`}
                type="date"
                value={date}
                max={marinaToday()}
                onChange={(e) => setDate(e.currentTarget.value)}
                className={input}
                {...errorProps(
                  `rf-date-${r.id}`,
                  tried && (!date || date > marinaToday()) ? "x" : undefined,
                )}
              />
              <FieldError
                id={`rf-date-${r.id}`}
                message={
                  tried && (!date || date > marinaToday())
                    ? "Enter a date that isn’t in the future."
                    : undefined
                }
              />
            </div>
          )}
          {mode === "processed" && (
            <div>
              <Label htmlFor={`rf-ref-${r.id}`}>Reference</Label>
              <input
                id={`rf-ref-${r.id}`}
                value={reference}
                maxLength={100}
                placeholder="e.g. NEFT UTR 1234"
                onChange={(e) => setReference(e.currentTarget.value)}
                className={input}
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label htmlFor={`rf-note-${r.id}`}>Note</Label>
            <input
              id={`rf-note-${r.id}`}
              value={note}
              maxLength={1000}
              placeholder={mode === "failed" ? "e.g. Customer did not collect it" : "Optional"}
              onChange={(e) => setNote(e.currentTarget.value)}
              className={input}
            />
          </div>
          <div className="flex flex-wrap gap-[10px] sm:col-span-2">
            <button type="submit" disabled={busy} className={smallPrimary} style={DARK_STYLE}>
              {busy ? "Saving…" : mode === "processed" ? "Save as handed back" : "Save as failed"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode("");
                setTried(false);
              }}
              className={smallOutline}
              style={OUTLINE_STYLE}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
