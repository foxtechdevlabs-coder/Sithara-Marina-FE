"use client";

import type { Route } from "next";
import Link from "next/link";
import { useId, useState } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
import { input, LoadState, OUTLINE_STYLE, SelectBox } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  SegmentTabs,
  smallOutline,
} from "@/features/admin/bookings/components/booking-ui";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { useDebounced } from "@/features/admin/fleet/hooks/use-debounced";
import { Pager } from "@/features/admin/reports/components/report-parts";
import { rupees } from "@/features/admin/reports/utils/report-format";
import { cx } from "@/lib/cx";
import {
  listPayments,
  listRefunds,
  type PaymentListQuery,
  type RefundListQuery,
} from "@/services/admin/payments.service";

import {
  exceptionLabel,
  moneyErrorMessage,
  paymentMethodText,
  paymentReference,
  paymentStatusLabel,
  refundChannelText,
  refundReference,
  refundStatusLabel,
} from "../utils/money-format";

type Tab = "payments" | "refunds" | "exceptions";
const PAGE_SIZE = 20;

const STATES: Record<Tab, { value: string; label: string }[]> = {
  payments: [
    { value: "", label: "All payment states" },
    { value: "succeeded", label: "Captured" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "failed", label: "Failed" },
    { value: "cancelled", label: "Cancelled" },
  ],
  refunds: [
    { value: "", label: "All refund states" },
    { value: "pending", label: "Processing" },
    { value: "processed", label: "Refunded" },
    { value: "failed", label: "Failed" },
  ],
  exceptions: [
    { value: "", label: "All exception states" },
    { value: "succeeded", label: "Captured" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
  ],
};

interface Row {
  key: string;
  transaction: string;
  href: Route;
  booking: { id: string; reference: string };
  amount: number;
  method: string;
  status: string;
}

/**
 * Payments & refunds: "Money movements, made clear." (admin Figma A19).
 * GET /admin/payments (and `needs_review=true` for exceptions), GET /admin/refunds.
 */
export function MoneyList({ initialTab = "payments" }: { initialTab?: Tab }) {
  const searchId = useId();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(query.trim());

  const base = {
    page,
    limit: PAGE_SIZE,
    ...(search ? { search: search.slice(0, 100) } : {}),
  };
  const request =
    tab === "refunds"
      ? ({ ...base, ...(state ? { status: state } : {}) } as RefundListQuery)
      : ({
          ...base,
          ...(state ? { status: state } : {}),
          ...(tab === "exceptions" ? { needs_review: true } : {}),
        } as PaymentListQuery);
  const key = `${tab}:${JSON.stringify(request)}`;
  const list = useAdminQuery(
    async (signal): Promise<{ key: string; rows: Row[]; total: number }> => {
      if (tab === "refunds") {
        const r = await listRefunds(request as RefundListQuery, signal);
        return {
          key,
          total: r.total,
          rows: r.items.map((x) => ({
            key: x.id,
            transaction: refundReference(x),
            href: adminRoutes.refundPayment(x.payment_id),
            booking: x.booking,
            amount: x.amount,
            method: refundChannelText(x.channel),
            status: refundStatusLabel(x.status),
          })),
        };
      }
      const r = await listPayments(request as PaymentListQuery, signal);
      return {
        key,
        total: r.total,
        rows: r.items.map((x) => ({
          key: x.id,
          transaction: paymentReference(x),
          href: adminRoutes.refundPayment(x.id),
          booking: x.booking,
          amount: x.amount,
          method:
            tab === "exceptions" && x.exception_reason
              ? exceptionLabel(x.exception_reason)
              : paymentMethodText(x),
          status:
            paymentStatusLabel(x.status) +
            (x.refunded_amount > 0 ? ` · ${rupees(x.refunded_amount)} refunded` : "") +
            (x.refund_pending_amount > 0 ? ` · ${rupees(x.refund_pending_amount)} refunding` : ""),
        })),
      };
    },
    `money:${key}`,
  );
  // The hook keeps the previous tab's rows while the next load runs: show them only under their own tab.
  const data = list.error || list.data?.key !== key ? null : list.data;
  const stale = !list.error && list.data && list.data.key !== key ? list.data : null;
  const shown = data ?? (stale?.key.startsWith(`${tab}:`) ? stale : null);
  const methodHead = tab === "exceptions" ? "Exception" : "Method";

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Money movements, made clear."
        subtitle="Payments and refunds across every booking channel."
      />

      <div className="mt-[24px] grid gap-x-[16px] gap-y-[18px] lg:mt-[30px] lg:max-w-[700px] lg:grid-cols-2">
        <div>
          <label htmlFor={searchId} className="block text-[10px]" style={{ color: BODY }}>
            Search {tab === "refunds" ? "refunds" : "payments"}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              setPage(1);
            }}
            placeholder={
              tab === "refunds" ? "Booking reference or customer" : "Reference, booking or customer"
            }
            className={cx(input, "mt-[8px]")}
          />
        </div>
        <div>
          <label htmlFor="money-state" className="block text-[10px]" style={{ color: BODY }}>
            State
          </label>
          <div className="mt-[8px]">
            <SelectBox
              id="money-state"
              value={state}
              onChange={(v) => {
                setState(v);
                setPage(1);
              }}
              options={STATES[tab]}
            />
          </div>
        </div>
      </div>

      <div className="mt-[28px]">
        <SegmentTabs
          label="Money movements"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setState("");
            setPage(1);
          }}
          options={[
            { value: "payments", label: "Payments" },
            { value: "refunds", label: "Refunds" },
            { value: "exceptions", label: "Exceptions" },
          ]}
        />
      </div>

      <div className="mt-[22px]">
        {!shown ? (
          <LoadState
            loading={list.loading}
            error={list.error ? `Couldn't load. ${moneyErrorMessage(list.error)}` : undefined}
            onRetry={list.reload}
            label="Loading"
          />
        ) : !shown.rows.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            {tab === "exceptions"
              ? "No payments need review."
              : search || state
                ? "Nothing matches these filters."
                : tab === "refunds"
                  ? "No refunds yet."
                  : "No payments yet."}
          </p>
        ) : (
          <div className={cx(list.loading && "opacity-60")}>
            <table className="hidden w-full border-collapse text-left text-[11px] lg:table">
              <caption className="sr-only">
                {tab === "refunds"
                  ? "Refunds"
                  : tab === "exceptions"
                    ? "Payment exceptions"
                    : "Payments"}
              </caption>
              <thead>
                <tr style={{ backgroundColor: SAND }}>
                  {["Transaction", "Booking", "Amount", methodHead, "Status"].map((h) => (
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
                {shown.rows.map((r) => (
                  <tr key={r.key} className="border-b border-[#ebe9e4]">
                    <td className="max-w-[220px] px-[12px] py-[12px] break-all">
                      <Link href={r.href} className="underline-offset-2 hover:underline">
                        {r.transaction}
                      </Link>
                    </td>
                    <td className="px-[12px] py-[12px]">
                      <Link
                        href={adminRoutes.booking(r.booking.id)}
                        className="underline-offset-2 hover:underline"
                      >
                        {r.booking.reference}
                      </Link>
                    </td>
                    <td className="px-[12px] py-[12px] tabular-nums">{rupees(r.amount)}</td>
                    <td className="px-[12px] py-[12px]">{r.method}</td>
                    <td className="px-[12px] py-[12px]">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="grid gap-[12px] lg:hidden">
              {shown.rows.map((r) => (
                <li key={r.key} className="border border-[#dcdad5] bg-white px-[16px] py-[16px]">
                  <p className="text-[16px] break-all">{r.transaction}</p>
                  <dl className="mt-[8px] grid grid-cols-2 gap-x-[12px] gap-y-[8px] text-[12px]">
                    {(
                      [
                        ["Booking", r.booking.reference],
                        ["Amount", rupees(r.amount)],
                        [methodHead, r.method],
                        ["Status", r.status],
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
                  <Link
                    href={r.href}
                    className={cx(smallOutline, "mt-[12px] h-[36px] w-fit")}
                    style={OUTLINE_STYLE}
                  >
                    View details →
                  </Link>
                </li>
              ))}
            </ul>

            <Pager
              page={page}
              total={shown.total}
              limit={PAGE_SIZE}
              busy={list.loading}
              onPage={setPage}
            />
          </div>
        )}
      </div>

      <InfoPanel title="Payment exceptions" className="mt-[24px]">
        A pending provider result is reconciled before a new payment or refund attempt. Confirmed
        debit with an expired slot requires staff review.
      </InfoPanel>
    </div>
  );
}
