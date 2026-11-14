"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
import {
  FieldError,
  Label,
  LoadState,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { resolvePartner, searchPartners } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { marinaToday } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { Pager } from "@/features/admin/reports/components/report-parts";
import { periodOptions, rupees } from "@/features/admin/reports/utils/report-format";
import { cx } from "@/lib/cx";
import { useRouter } from "next/navigation";
import { listPayouts, type PayoutListQuery } from "@/services/admin/payouts.service";

import { paidDateText, payoutErrorMessage } from "../utils/payout-format";

const PAGE_SIZE = 20;

/**
 * Payouts: open a partner's statement for a period (GET /admin/payouts/summary)
 * and browse recorded payouts (GET /admin/payouts).
 */
export function PayoutList() {
  const router = useRouter();
  const [periods] = useState(() => periodOptions(marinaToday()));
  // Statement picker
  const [statementPartner, setStatementPartner] = useState("");
  const [periodKey, setPeriodKey] = useState(periods[0]!.key);
  const [tried, setTried] = useState(false);
  // Recorded payouts
  const [partnerId, setPartnerId] = useState("");
  const [page, setPage] = useState(1);

  const query: PayoutListQuery = {
    page,
    limit: PAGE_SIZE,
    ...(partnerId ? { partner_id: partnerId } : {}),
  };
  const list = useAdminQuery(
    (signal) => listPayouts(query, signal),
    `payouts:${JSON.stringify(query)}`,
  );
  const rows = list.data?.items ?? [];

  function openStatement(event: FormEvent) {
    event.preventDefault();
    setTried(true);
    if (!statementPartner) return;
    const period = periods.find((p) => p.key === periodKey) ?? periods[0]!;
    router.push(adminRoutes.payoutStatement(statementPartner, period.from, period.to));
  }

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Settled, clearly."
        subtitle="Partner statements and the transfers recorded against them."
      />

      <form
        onSubmit={openStatement}
        noValidate
        aria-labelledby="statement-title"
        className="mt-[24px] border border-[#e3e1dc] bg-white px-[18px] py-[20px] lg:mt-[30px] lg:max-w-[880px] lg:px-[22px]"
      >
        <h2 id="statement-title" className="text-[20px] leading-[26px]">
          Open a statement
        </h2>
        <p className="mt-[6px] text-[12px]" style={{ color: BODY }}>
          A partner’s bookings by charter date, with what is paid and what is outstanding.
        </p>
        <div className="mt-[18px] grid gap-x-[16px] gap-y-[18px] sm:grid-cols-2">
          <div>
            <Label htmlFor="statement-partner" required>
              Partner
            </Label>
            <SearchSelect
              id="statement-partner"
              value={statementPartner}
              onChange={(v) => setStatementPartner(v)}
              load={searchPartners()}
              resolve={resolvePartner}
              placeholder="Search partners by name"
              noResults="No partner matches."
              invalid={tried && !statementPartner ? "Choose a partner." : undefined}
            />
            <FieldError
              id="statement-partner"
              message={tried && !statementPartner ? "Choose a partner." : undefined}
            />
          </div>
          <div>
            <Label htmlFor="statement-period">Period</Label>
            <SelectBox
              id="statement-period"
              value={periodKey}
              onChange={setPeriodKey}
              options={periods.map((p) => ({ value: p.key, label: p.label }))}
            />
          </div>
        </div>
        <button
          type="submit"
          className={cx(smallPrimary, "mt-[18px] min-w-[150px]")}
          style={PRIMARY_STYLE}
        >
          Open statement
        </button>
      </form>

      <section aria-labelledby="recorded-title" className="mt-[36px]">
        <div className="flex flex-wrap items-end justify-between gap-[14px]">
          <h2 id="recorded-title" className="text-[24px] leading-[30px]">
            Recorded payouts
          </h2>
          <div className="w-full sm:w-[300px]">
            <Label htmlFor="payouts-partner">Partner</Label>
            <SearchSelect
              id="payouts-partner"
              value={partnerId}
              onChange={(v) => {
                setPartnerId(v);
                setPage(1);
              }}
              load={searchPartners()}
              resolve={resolvePartner}
              clearable
              emptyLabel="All partners"
              placeholder="Search partners by name"
              noResults="No partner matches."
            />
          </div>
        </div>

        <div className="mt-[18px]">
          {!list.data ? (
            <LoadState
              loading={list.loading}
              error={
                list.error ? `Couldn't load payouts. ${payoutErrorMessage(list.error)}` : undefined
              }
              onRetry={list.reload}
              label="Loading payouts"
            />
          ) : !rows.length ? (
            <p className="text-[13px]" style={{ color: BODY }}>
              {partnerId ? "No payouts recorded for this partner yet." : "No payouts recorded yet."}
            </p>
          ) : (
            <div className={cx(list.loading && "opacity-60")}>
              <table className="hidden w-full border-collapse text-left text-[11px] lg:table">
                <caption className="sr-only">Recorded payouts</caption>
                <thead>
                  <tr style={{ backgroundColor: SAND }}>
                    {["Paid date", "Partner", "Transfer reference", "Amount", ""].map((h, i) => (
                      <th
                        key={i}
                        scope="col"
                        className={cx("px-[12px] py-[12px] font-normal", i === 3 && "text-right")}
                        style={{ color: BODY }}
                      >
                        {h || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-[#ebe9e4]">
                      <td className="px-[12px] py-[12px]">{paidDateText(p.paid_on)}</td>
                      <td className="max-w-[240px] px-[12px] py-[12px] break-words">
                        {p.partner.name}
                      </td>
                      <td className="max-w-[240px] px-[12px] py-[12px] break-all">{p.reference}</td>
                      <td className="px-[12px] py-[12px] text-right tabular-nums">
                        {rupees(p.amount)}
                      </td>
                      <td className="px-[12px] py-[12px] text-right">
                        <Link
                          href={adminRoutes.payout(p.id)}
                          className="underline underline-offset-2"
                        >
                          View<span className="sr-only"> payout {p.reference}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="grid gap-[12px] lg:hidden">
                {rows.map((p) => (
                  <li key={p.id} className="border border-[#dcdad5] bg-white px-[16px] py-[16px]">
                    <p className="text-[16px] break-words">{p.partner.name}</p>
                    <p className="mt-[4px] text-[12px]" style={{ color: BODY }}>
                      {paidDateText(p.paid_on)} · <span className="break-all">{p.reference}</span>
                    </p>
                    <p className="mt-[6px] text-[15px]">{rupees(p.amount)}</p>
                    <Link
                      href={adminRoutes.payout(p.id)}
                      className={cx(smallOutline, "mt-[12px] h-[36px] w-fit")}
                      style={OUTLINE_STYLE}
                    >
                      View payout →
                    </Link>
                  </li>
                ))}
              </ul>
              <Pager
                page={page}
                total={list.data.total}
                limit={PAGE_SIZE}
                busy={list.loading}
                onPage={setPage}
              />
            </div>
          )}
        </div>
      </section>

      <InfoPanel title="Recording, not transferring" className="mt-[26px] lg:max-w-[880px]">
        Payouts record transfers already made from the bank. Only completed bookings can be paid,
        and a booking can be paid once.
      </InfoPanel>
    </div>
  );
}
