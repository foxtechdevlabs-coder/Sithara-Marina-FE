"use client";

import Link from "next/link";

import { BODY, SAND } from "@/components/admin/admin-theme";
import { LoadState, Notice, OUTLINE_STYLE } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  DetailList,
  PageHeader,
  pagePadding,
  smallOutline,
} from "@/features/admin/bookings/components/booking-ui";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { rupees } from "@/features/admin/reports/utils/report-format";
import { cx } from "@/lib/cx";
import { getPayout } from "@/services/admin/payouts.service";

import { paidDateText, payoutErrorMessage } from "../utils/payout-format";

const charterDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

/** A recorded payout with its bookings (GET /admin/payouts/{id}). */
export function PayoutDetail({ payoutId, recorded }: { payoutId: string; recorded?: boolean }) {
  const payout = useAdminQuery((signal) => getPayout(payoutId, signal), `payout:${payoutId}`);

  if (!payout.data) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A recorded payout." />
        <div className="mt-[24px]">
          <LoadState
            loading={payout.loading}
            error={
              payout.error
                ? `Couldn't load the payout. ${payoutErrorMessage(payout.error)}`
                : undefined
            }
            onRetry={payout.reload}
            label="Loading payout"
          />
        </div>
      </div>
    );
  }
  const p = payout.data;
  const followUp = p.lines.filter((l) => l.booking_status !== "completed");

  return (
    <div className={pagePadding}>
      <PageHeader title="A recorded payout." subtitle={`${p.reference} · ${p.partner.name}`} />
      {recorded && (
        <Notice className="mt-[20px] lg:max-w-[880px]">
          Payout recorded. The statement’s bookings are marked paid and an audit entry was created.
        </Notice>
      )}

      <DetailList
        className="mt-[24px] lg:max-w-[880px]"
        items={[
          ["Amount", rupees(p.amount)],
          ["Paid date", paidDateText(p.paid_on)],
          [
            "Transfer reference",
            <span key="r" className="break-all">
              {p.reference}
            </span>,
          ],
          ["Partner", p.partner.name],
          ...(p.notes ? ([["Notes", p.notes]] as [string, string][]) : []),
        ]}
      />

      <div className="mt-[28px] overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-[11px]">
          <caption className="sr-only">Bookings in this payout</caption>
          <thead>
            <tr style={{ backgroundColor: SAND }}>
              {["Booking", "Charter date", "Booking total", "Commission", "Partner share"].map(
                (h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-[12px] py-[12px] font-normal"
                    style={{ color: BODY }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="bg-white">
            {p.lines.map((l) => (
              <tr key={l.booking_id} className="border-b border-[#ebe9e4]">
                <td className="px-[12px] py-[12px]">
                  <Link
                    href={adminRoutes.booking(l.booking_id)}
                    className="underline-offset-2 hover:underline"
                  >
                    {l.reference}
                  </Link>
                  <span className="block text-[10px]" style={{ color: BODY }}>
                    {l.yacht_name}
                  </span>
                </td>
                <td className="px-[12px] py-[12px]">{charterDate(l.starts_at)}</td>
                <td className="px-[12px] py-[12px] tabular-nums">{rupees(l.gross_amount)}</td>
                <td className="px-[12px] py-[12px] tabular-nums">{rupees(l.commission_amount)}</td>
                <td className="px-[12px] py-[12px] tabular-nums">{rupees(l.partner_payable)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {followUp.length > 0 && (
        <Notice tone="error" className="mt-[18px] lg:max-w-[880px]">
          {followUp.map((l) => l.reference).join(", ")} {followUp.length === 1 ? "is" : "are"} no
          longer completed after this payout. Follow up with the partner.
        </Notice>
      )}

      <div className="mt-[26px] flex flex-wrap gap-[14px]">
        <Link
          href={adminRoutes.payouts}
          className={cx(smallOutline, "min-w-[150px]")}
          style={OUTLINE_STYLE}
        >
          Back to payouts
        </Link>
      </div>
    </div>
  );
}
