"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BODY } from "@/components/admin/admin-theme";
import { Label, LoadState, PRIMARY_STYLE, SelectBox } from "@/components/admin/form-parts";
import { resolvePartner, searchPartners } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import {
  PageHeader,
  pagePadding,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { marinaToday } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { ExportButtons, Pager, ReportRows } from "@/features/admin/reports/components/report-parts";
import { CommissionSummary } from "@/features/admin/reports/components/reports-screen";
import {
  periodOptions,
  periodText,
  reportErrorMessage,
} from "@/features/admin/reports/utils/report-format";
import { cx } from "@/lib/cx";
import { getReport, type ReportQuery } from "@/services/admin/reports.service";

const PAGE_SIZE = 20;

/**
 * Commissions landing: "Commission earned" (GET /admin/reports/commission)
 * for every partner or one, with "Add custom commission" leading to the rule
 * form (/admin/commissions/new).
 */
export function CommissionOverview({ initialPartner = "" }: { initialPartner?: string }) {
  const router = useRouter();
  const [periods] = useState(() => periodOptions(marinaToday()));
  const [periodKey, setPeriodKey] = useState(periods[0]!.key);
  const [partnerId, setPartnerId] = useState(initialPartner);
  const [partnerName, setPartnerName] = useState("");
  const [page, setPage] = useState(1);
  const period = periods.find((p) => p.key === periodKey) ?? periods[0]!;

  const query: ReportQuery = {
    from: period.from,
    to: period.to,
    ...(partnerId ? { partner_id: partnerId } : {}),
    page,
    limit: PAGE_SIZE,
  };
  const key = JSON.stringify(query);
  const report = useAdminQuery(
    (signal) => getReport("commission", query, signal).then((r) => ({ key, report: r })),
    `commission-overview:${key}`,
  );
  // Show a report only under the filters it was asked for.
  const current = report.data?.key === key ? report.data.report : null;
  const shown = report.error ? null : (current ?? report.data?.report ?? null);
  const name =
    partnerName ||
    current?.summary.by_partner.find((p) => p.partner_id === partnerId)?.partner_name;

  function choosePartner(id: string, label: string) {
    setPartnerId(id);
    setPartnerName(label);
    setPage(1);
    router.replace(adminRoutes.commissionsFor(id), { scroll: false });
  }

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Fair value, clearly defined."
        subtitle="Commission earned on partner yachts, and the rules behind it."
      />

      <div className="mt-[24px] lg:mt-[30px]">
        <Link
          href={adminRoutes.commissionNew(partnerId)}
          className={cx(smallPrimary, "w-fit min-w-[180px]")}
          style={PRIMARY_STYLE}
        >
          <Plus aria-hidden="true" className="size-[13px]" />
          Add custom commission
        </Link>
      </div>

      <section aria-labelledby="commission-earned" className="mt-[34px]">
        <div className="flex flex-wrap items-end justify-between gap-[16px]">
          <div className="min-w-0">
            <h2 id="commission-earned" className="text-[26px] leading-[32px] lg:text-[30px]">
              Commission earned
            </h2>
            <p className="mt-[6px] text-[12px] break-words" style={{ color: BODY }}>
              {partnerId ? (name ?? "Selected partner") : "All partners"} ·{" "}
              {periodText(period.from, period.to)}
            </p>
          </div>
          <div className="grid w-full gap-[14px] sm:grid-cols-2 lg:w-[560px]">
            <div>
              <Label htmlFor="commission-partner">Partner</Label>
              <SearchSelect
                id="commission-partner"
                value={partnerId}
                onChange={(v, option) => choosePartner(v, option?.data?.name ?? "")}
                load={searchPartners()}
                resolve={resolvePartner}
                clearable
                emptyLabel="All partners"
                placeholder="Search partners by name"
                noResults="No partner matches."
              />
            </div>
            <div>
              <Label htmlFor="commission-period">Period</Label>
              <SelectBox
                id="commission-period"
                value={periodKey}
                onChange={(v) => {
                  setPeriodKey(v);
                  setPage(1);
                }}
                options={periods.map((p) => ({ value: p.key, label: p.label }))}
              />
            </div>
          </div>
        </div>

        <div className="mt-[22px]">
          {!shown ? (
            <LoadState
              loading={report.loading}
              error={
                report.error
                  ? `Couldn't load the commission report. ${reportErrorMessage(report.error)}`
                  : undefined
              }
              onRetry={report.reload}
              label="Loading commission report"
            />
          ) : (
            <div className={cx(report.loading && "opacity-60")}>
              <CommissionSummary summary={shown.summary} />
              <div className="mt-[26px] mb-[12px] flex flex-wrap items-end justify-between gap-[12px]">
                <h3 className="text-[20px] leading-[26px]">Bookings</h3>
                <ExportButtons type="commission" query={query} />
              </div>
              <ReportRows
                caption="Commission by booking"
                columns={shown.columns}
                items={shown.items}
              />
              <Pager
                page={page}
                total={shown.total}
                limit={PAGE_SIZE}
                busy={report.loading}
                onPage={setPage}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
