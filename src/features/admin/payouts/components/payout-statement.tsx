"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
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
import {
  DetailList,
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { marinaToday } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { periodText, rupees } from "@/features/admin/reports/utils/report-format";
import { cx } from "@/lib/cx";
import {
  getPayoutSummary,
  recordPayout,
  type PayoutSummary,
} from "@/services/admin/payouts.service";

import {
  isPayable,
  lineNote,
  paidDateText,
  payoutErrorMessage,
  statementStatus,
} from "../utils/payout-format";

const MAX_REFERENCE = 255;

/** A partner's statement for a period: "A transparent statement." (admin Figma A18). */
export function PayoutStatement({
  partnerId,
  from,
  to,
}: {
  partnerId: string;
  from: string;
  to: string;
}) {
  const summary = useAdminQuery(
    (signal) => getPayoutSummary(partnerId, from, to, signal),
    `payout-summary:${partnerId}:${from}:${to}`,
  );

  if (!summary.data) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A transparent statement." />
        <div className="mt-[24px]">
          <LoadState
            loading={summary.loading}
            error={
              summary.error
                ? `Couldn't load the statement. ${payoutErrorMessage(summary.error)}`
                : undefined
            }
            onRetry={summary.reload}
            label="Loading statement"
          />
          {Boolean(summary.error) && !summary.loading && (
            <Link
              href={adminRoutes.payouts}
              className={cx(smallOutline, "mt-[18px] w-fit")}
              style={OUTLINE_STYLE}
            >
              Back to payouts
            </Link>
          )}
        </div>
      </div>
    );
  }
  return <Statement summary={summary.data} onStale={summary.reload} />;
}

function Statement({ summary: s, onStale }: { summary: PayoutSummary; onStale: () => void }) {
  const router = useRouter();
  const today = marinaToday();
  const payable = s.lines.filter(isPayable);
  // Every payable line starts selected; staff can leave some for a later transfer.
  const [unselected, setUnselected] = useState<Set<string>>(new Set());
  const [paidOn, setPaidOn] = useState("");
  const [reference, setReference] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  const selected = payable.filter((l) => !unselected.has(l.booking_id));
  const amount = selected.reduce((sum, l) => sum + l.partner_payable, 0);
  const label = `${s.partner.name} · ${periodText(s.from, s.to)}`;

  const errors: { paidOn?: string; reference?: string; lines?: string } = {};
  if (submitted) {
    if (!paidOn) errors.paidOn = "Enter the date the transfer was made.";
    else if (paidOn > today) errors.paidOn = "The transfer date can’t be in the future.";
    if (!reference.trim()) errors.reference = "Enter the bank transfer’s reference.";
    if (!selected.length) errors.lines = "Select at least one booking to mark paid.";
  }

  function toggle(id: string) {
    setUnselected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function review(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setFailure("");
    if (!paidOn || paidOn > today || !reference.trim() || !selected.length) return;
    setConfirming(true);
    window.scrollTo({ top: 0 });
  }

  async function markPaid() {
    setBusy(true);
    setFailure("");
    try {
      const payout = await recordPayout({
        partner_id: s.partner.id,
        booking_ids: selected.map((l) => l.booking_id),
        paid_on: paidOn,
        reference: reference.trim(),
        amount,
      });
      router.push(`${adminRoutes.payout(payout.id)}?recorded=1` as Route);
    } catch (err) {
      setFailure(payoutErrorMessage(err));
      setBusy(false);
      setConfirming(false);
      onStale();
    }
  }

  if (confirming) {
    return (
      <div className={pagePadding}>
        <PageHeader title="Confirm the recorded payout." subtitle={label} />
        <DetailList
          className="mt-[24px] lg:mt-[30px] lg:max-w-[880px]"
          items={[
            ["Amount", rupees(amount)],
            ["Paid date", paidDateText(paidOn)],
            ["Transfer reference", reference.trim()],
            ["Bookings", selected.map((l) => l.reference).join(", ")],
          ]}
        />
        <InfoPanel title="Record an existing transfer" className="mt-[24px] lg:max-w-[880px]">
          This marks the statement as paid and creates an audit entry. It does not initiate a
          transfer. An already paid statement cannot be marked paid again.
        </InfoPanel>
        <div className="mt-[24px] flex flex-wrap gap-[14px]">
          <button
            type="button"
            disabled={busy}
            onClick={() => void markPaid()}
            className={cx(smallPrimary, "min-w-[150px]")}
            style={PRIMARY_STYLE}
          >
            {busy ? "Recording…" : "Mark statement paid"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className={cx(smallOutline, "min-w-[150px]")}
            style={OUTLINE_STYLE}
          >
            Review statement
          </button>
        </div>
      </div>
    );
  }

  const status = statementStatus(s);

  return (
    <div className={pagePadding}>
      <PageHeader title="A transparent statement." subtitle={label} />
      <p
        className="mt-[18px] inline-flex h-[28px] items-center px-[12px] text-[11px]"
        style={{ backgroundColor: SAND }}
      >
        {status}
      </p>

      <form onSubmit={review} noValidate className="mt-[24px]">
        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full border-collapse text-left text-[11px]">
            <caption className="sr-only">Bookings in this statement</caption>
            <thead>
              <tr style={{ backgroundColor: SAND }}>
                <th scope="col" className="w-[44px] px-[12px] py-[12px] font-normal">
                  <span className="sr-only">Include</span>
                </th>
                {["Booking", "Booking total", "Commission", "Partner share"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-[12px] py-[12px] font-normal"
                    style={{ color: BODY }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {s.lines.map((l) => {
                const canPay = isPayable(l);
                return (
                  <tr key={l.booking_id} className="border-b border-[#ebe9e4] align-top">
                    <td className="px-[12px] py-[12px]">
                      {canPay && (
                        <input
                          type="checkbox"
                          aria-label={`Include ${l.reference}`}
                          checked={!unselected.has(l.booking_id)}
                          onChange={() => toggle(l.booking_id)}
                          className="size-[15px] accent-[#0d1b2a]"
                        />
                      )}
                    </td>
                    <td className="px-[12px] py-[12px]">
                      <Link
                        href={adminRoutes.booking(l.booking_id)}
                        className="underline-offset-2 hover:underline"
                      >
                        {l.reference}
                      </Link>
                      <span className="block text-[10px]" style={{ color: BODY }}>
                        {l.yacht_name} · {lineNote(l)}
                      </span>
                    </td>
                    <td className="px-[12px] py-[12px] tabular-nums">{rupees(l.gross_amount)}</td>
                    <td className="px-[12px] py-[12px] tabular-nums">
                      {rupees(l.commission_amount)}
                      {l.commission_rate !== null && (
                        <span className="ml-[4px]" style={{ color: BODY }}>
                          ({l.commission_rate}%)
                        </span>
                      )}
                    </td>
                    <td className="px-[12px] py-[12px] tabular-nums">
                      {rupees(l.partner_payable)}
                    </td>
                  </tr>
                );
              })}
              {!s.lines.length && (
                <tr className="border-b border-[#ebe9e4]">
                  <td colSpan={5} className="px-[12px] py-[12px]" style={{ color: BODY }}>
                    No partner bookings with a charter date in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Phone cards */}
        <ul className="grid gap-[12px] lg:hidden">
          {s.lines.map((l) => {
            const canPay = isPayable(l);
            return (
              <li
                key={l.booking_id}
                className="border border-[#dcdad5] bg-white px-[16px] py-[16px]"
              >
                <div className="flex items-start gap-[10px]">
                  {canPay && (
                    <input
                      type="checkbox"
                      aria-label={`Include ${l.reference}`}
                      checked={!unselected.has(l.booking_id)}
                      onChange={() => toggle(l.booking_id)}
                      className="mt-[4px] size-[16px] shrink-0 accent-[#0d1b2a]"
                    />
                  )}
                  <div className="min-w-0">
                    <Link
                      href={adminRoutes.booking(l.booking_id)}
                      className="text-[16px] underline underline-offset-2"
                    >
                      {l.reference}
                    </Link>
                    <p className="text-[11px]" style={{ color: BODY }}>
                      {l.yacht_name} · {lineNote(l)}
                    </p>
                  </div>
                </div>
                <dl className="mt-[10px] grid grid-cols-3 gap-[8px] text-[12px]">
                  {(
                    [
                      ["Booking total", rupees(l.gross_amount)],
                      ["Commission", rupees(l.commission_amount)],
                      ["Partner share", rupees(l.partner_payable)],
                    ] as const
                  ).map(([t, v]) => (
                    <div key={t} className="min-w-0">
                      <dt className="text-[10px]" style={{ color: BODY }}>
                        {t}
                      </dt>
                      <dd className="break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
          {!s.lines.length && (
            <li className="text-[12px]" style={{ color: BODY }}>
              No partner bookings with a charter date in this period.
            </li>
          )}
        </ul>

        <div className="mt-[18px] grid gap-[6px] text-[13px] lg:max-w-[880px] lg:grid-cols-2">
          <span>Net payable</span>
          <span className="text-[16px] tabular-nums">
            {rupees(amount)}
            {selected.length !== payable.length && (
              <span className="ml-[6px] text-[11px]" style={{ color: BODY }}>
                ({selected.length} of {payable.length} payable bookings)
              </span>
            )}
          </span>
        </div>
        <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
          Period total {rupees(s.totals.partner_payable)} · already paid{" "}
          {rupees(s.totals.paid_amount)} · outstanding {rupees(s.totals.outstanding_amount)}. Only
          completed bookings can be paid out.
        </p>
        <FieldError id="payout-lines" message={errors.lines} />

        {payable.length > 0 ? (
          <>
            <InfoPanel title="Before marking paid" className="mt-[22px] lg:max-w-[880px]">
              Reconcile the statement and confirm the transfer has already been made. This action
              records the payout; it does not transfer funds.
            </InfoPanel>

            <div className="mt-[24px] grid gap-x-[18px] gap-y-[22px] lg:max-w-[700px] lg:grid-cols-2">
              <div>
                <Label htmlFor="payout-date" required>
                  Paid date
                </Label>
                <input
                  id="payout-date"
                  type="date"
                  value={paidOn}
                  max={today}
                  onChange={(e) => setPaidOn(e.currentTarget.value)}
                  className={input}
                  {...errorProps("payout-date", errors.paidOn)}
                />
                <FieldError id="payout-date" message={errors.paidOn} />
              </div>
              <div>
                <Label htmlFor="payout-reference" required>
                  Transfer reference
                </Label>
                <input
                  id="payout-reference"
                  value={reference}
                  maxLength={MAX_REFERENCE}
                  autoComplete="off"
                  placeholder="Enter payment reference"
                  onChange={(e) => setReference(e.currentTarget.value)}
                  className={input}
                  {...errorProps("payout-reference", errors.reference)}
                />
                <FieldError id="payout-reference" message={errors.reference} />
              </div>
            </div>
          </>
        ) : (
          <InfoPanel title="Nothing to mark paid" className="mt-[22px] lg:max-w-[880px]">
            {s.lines.length
              ? "Every completed booking in this period is already paid, or no booking has completed yet."
              : "Choose another period or partner."}
          </InfoPanel>
        )}

        {failure && (
          <Notice tone="error" className="mt-[20px] lg:max-w-[880px]">
            {failure}
          </Notice>
        )}

        <div className="mt-[26px] flex flex-wrap gap-[14px]">
          {payable.length > 0 && (
            <button
              type="submit"
              className={cx(smallPrimary, "min-w-[150px]")}
              style={PRIMARY_STYLE}
            >
              Review mark as paid
            </button>
          )}
          <Link
            href={adminRoutes.payouts}
            className={cx(smallOutline, "min-w-[150px]")}
            style={OUTLINE_STYLE}
          >
            Back to payouts
          </Link>
        </div>
      </form>
    </div>
  );
}
