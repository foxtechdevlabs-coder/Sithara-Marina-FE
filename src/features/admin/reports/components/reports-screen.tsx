"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { BODY, MUTED } from "@/components/admin/admin-theme";
import { input, Label, LoadState, SelectBox } from "@/components/admin/form-parts";
import {
  resolvePartner,
  resolveYacht,
  searchPartners,
  searchYachts,
} from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  SegmentTabs,
} from "@/features/admin/bookings/components/booking-ui";
import { marinaToday } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { adminRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import {
  getReport,
  REPORT_FILTERS,
  REPORT_TYPES,
  type Report,
  type ReportQuery,
  type ReportType,
} from "@/services/admin/reports.service";

import {
  hoursText,
  periodOptions,
  periodText,
  REPORT_LABEL,
  reportErrorMessage,
  rupees,
  valueLabel,
} from "../utils/report-format";
import { ExportButtons, Pager, ReportRows, SimpleTable, StatTiles } from "./report-parts";

const PAGE_SIZE = 25;
const CUSTOM = "custom";

const BOOKING_STATUSES = [
  "pending_payment",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
  "no_show",
];

const NOTES: Record<ReportType, string> = {
  bookings: "Every booking whose charter date falls in the period, in any status.",
  revenue:
    "Booked value of confirmed and completed charters, incl. GST. Provisional until payments and refunds are recorded.",
  commission:
    "Partner yachts only. The rate is the one snapshotted when each booking’s payment was confirmed.",
  payouts: "What each partner is owed for the period, paid and unpaid.",
  utilisation: "Booked hours against the hours each yacht could be chartered. Provisional figures.",
};

function Summary({ type, report }: { type: ReportType; report: Report<ReportType> }): ReactNode {
  switch (type) {
    case "bookings": {
      const s = (report as Report<"bookings">).summary;
      return (
        <>
          <StatTiles
            items={[
              { label: "Bookings", value: s.bookings.toLocaleString("en-IN") },
              {
                label: "Booked value",
                value: rupees(s.booked_amount),
                note: "Confirmed and completed, incl. GST",
              },
              { label: "Own yachts", value: String(s.by_ownership.own ?? 0) },
              { label: "Partner yachts", value: String(s.by_ownership.partner ?? 0) },
            ]}
          />
          <p className="mt-[12px] text-[11px]" style={{ color: BODY }}>
            {Object.entries(s.by_status)
              .map(([k, v]) => `${valueLabel(k)} ${v}`)
              .join(" · ") || "No bookings"}
          </p>
          <h3 className="mt-[22px] mb-[10px] text-[16px]">By yacht</h3>
          <SimpleTable
            caption="Bookings by yacht"
            head={["Yacht", "Ownership", "Bookings"]}
            rows={s.by_yacht.map((y) => ({
              key: y.yacht_id,
              cells: [y.yacht_name, valueLabel(y.ownership), y.bookings],
            }))}
          />
        </>
      );
    }
    case "revenue": {
      const s = (report as Report<"revenue">).summary;
      return (
        <>
          <StatTiles
            items={[
              {
                label: "Gross booked",
                value: rupees(s.gross_amount),
                note: `${s.bookings} charters, incl. GST`,
              },
              { label: "Before GST", value: rupees(s.subtotal) },
              { label: "GST", value: rupees(s.tax_amount) },
              {
                label: "Net collected",
                value: s.net_amount === null ? "—" : rupees(s.net_amount),
                note: s.net_amount === null ? "Not recorded yet" : undefined,
              },
            ]}
          />
          <div className="mt-[22px] grid gap-[22px] lg:grid-cols-2">
            <div>
              <h3 className="mb-[10px] text-[16px]">By yacht</h3>
              <SimpleTable
                caption="Revenue by yacht"
                head={["Yacht", "Charters", "Gross"]}
                rows={s.by_yacht.map((y) => ({
                  key: y.yacht_id,
                  cells: [y.yacht_name, y.bookings, rupees(y.gross_amount)],
                }))}
              />
            </div>
            <div>
              <h3 className="mb-[10px] text-[16px]">By month</h3>
              <SimpleTable
                caption="Revenue by month"
                head={["Month", "Charters", "Gross"]}
                rows={s.by_month.map((m) => ({
                  key: m.month,
                  cells: [
                    new Date(`${m.month}-01T00:00:00Z`).toLocaleDateString("en-GB", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    }),
                    m.bookings,
                    rupees(m.gross_amount),
                  ],
                }))}
              />
            </div>
          </div>
        </>
      );
    }
    case "commission": {
      const s = (report as Report<"commission">).summary;
      return <CommissionSummary summary={s} />;
    }
    case "payouts": {
      const s = (report as Report<"payouts">).summary;
      return (
        <>
          <StatTiles
            items={[
              { label: "Bookings", value: s.bookings.toLocaleString("en-IN") },
              { label: "Paid", value: rupees(s.paid_amount), note: `${s.paid_count} bookings` },
              {
                label: "Unpaid",
                value: rupees(s.unpaid_amount),
                note: `${s.unpaid_count} bookings`,
              },
              { label: "Partners", value: String(s.by_partner.length) },
            ]}
          />
          <h3 className="mt-[22px] mb-[10px] text-[16px]">By partner</h3>
          <SimpleTable
            caption="Payouts by partner"
            head={["Partner", "Paid", "Unpaid"]}
            rows={s.by_partner.map((p) => ({
              key: p.partner_id,
              cells: [p.partner_name, rupees(p.paid_amount), rupees(p.unpaid_amount)],
            }))}
          />
        </>
      );
    }
    case "utilisation": {
      const s = (report as Report<"utilisation">).summary;
      return (
        <StatTiles
          items={[
            {
              label: "Utilisation",
              value: `${Number(s.percent.toFixed(1))}%`,
              note: "Provisional",
            },
            { label: "Booked", value: hoursText(s.booked_minutes) },
            { label: "Available", value: hoursText(s.available_minutes) },
            { label: "Yachts", value: String(s.yachts) },
          ]}
        />
      );
    }
  }
}

/** The commission report's figures and partner breakdown (also on the Commissions page). */
export function CommissionSummary({ summary: s }: { summary: Report<"commission">["summary"] }) {
  return (
    <>
      <StatTiles
        items={[
          { label: "Partner bookings", value: s.bookings.toLocaleString("en-IN") },
          {
            label: "Charter basis",
            value: s.charter_amount === null ? "—" : rupees(s.charter_amount),
            note:
              s.charter_amount === null
                ? "Some bookings have no snapshot"
                : "Excl. GST and add-ons",
          },
          { label: "Commission", value: rupees(s.commission_amount) },
          {
            label: "Partner payable",
            value: rupees(s.partner_payable),
            note: "Before settlement adjustments",
          },
        ]}
      />
      <h3 className="mt-[22px] mb-[10px] text-[16px]">By partner</h3>
      <SimpleTable
        caption="Commission by partner"
        head={["Partner", "Bookings", "Commission", "Partner payable"]}
        rows={s.by_partner.map((p) => ({
          key: p.partner_id,
          cells: [
            p.partner_name,
            p.bookings,
            rupees(p.commission_amount),
            rupees(p.partner_payable),
          ],
        }))}
      />
    </>
  );
}

/** Reports (admin): every backend report with filters, a summary, its rows and export. */
export function ReportsScreen({ initialType = "bookings" }: { initialType?: ReportType }) {
  const [periods] = useState(() => periodOptions(marinaToday()));
  const [type, setType] = useState<ReportType>(initialType);
  const [periodKey, setPeriodKey] = useState(periods[0]!.key);
  const [customFrom, setCustomFrom] = useState(periods[0]!.from);
  const [customTo, setCustomTo] = useState(periods[0]!.to);
  const [filters, setFilters] = useState<Partial<ReportQuery>>({});
  const [page, setPage] = useState(1);

  const preset = periods.find((p) => p.key === periodKey);
  const from = preset ? preset.from : customFrom;
  const to = preset ? preset.to : customTo;
  const customInvalid = !preset && (!customFrom || !customTo || customTo < customFrom);

  const allowed = REPORT_FILTERS[type];
  const query: ReportQuery = {
    from,
    to,
    page,
    limit: PAGE_SIZE,
    ...Object.fromEntries(
      Object.entries(filters).filter(([k]) => allowed.includes(k as keyof ReportQuery)),
    ),
  };
  const report = useAdminQuery(
    (signal) =>
      customInvalid
        ? Promise.resolve(null)
        : getReport(type, query, signal).then((r) => ({ type, report: r })),
    `report:${type}:${JSON.stringify(query)}`,
  );

  const setFilter = (key: keyof ReportQuery, value: string) => {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
    setPage(1);
  };
  // While another report loads, the hook still holds the previous one: only show
  // a report under its own tab.
  const data = report.error || report.data?.type !== type ? null : (report.data?.report ?? null);

  return (
    <div className={pagePadding}>
      <PageHeader
        title="The numbers behind the season."
        subtitle={
          <>
            Every report with its rows, filters and export, by charter date.{" "}
            <Link href={adminRoutes.reports} className="underline underline-offset-2">
              Back to the overview
            </Link>
          </>
        }
      />

      <div className="mt-[24px] overflow-x-auto lg:mt-[30px]">
        <SegmentTabs
          label="Report"
          value={type}
          onChange={(v) => {
            setType(v);
            setPage(1);
          }}
          options={REPORT_TYPES.map((t) => ({ value: t, label: REPORT_LABEL[t] }))}
        />
      </div>

      <div className="mt-[22px] grid gap-x-[16px] gap-y-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="report-period">Period</Label>
          <SelectBox
            id="report-period"
            value={periodKey}
            onChange={(v) => {
              setPeriodKey(v);
              setPage(1);
            }}
            options={[
              ...periods.map((p) => ({ value: p.key, label: p.label })),
              { value: CUSTOM, label: "Custom dates" },
            ]}
          />
        </div>
        {!preset && (
          <>
            <div>
              <Label htmlFor="report-from">From</Label>
              <input
                id="report-from"
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.currentTarget.value);
                  setPage(1);
                }}
                className={input}
              />
            </div>
            <div>
              <Label htmlFor="report-to">To</Label>
              <input
                id="report-to"
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => {
                  setCustomTo(e.currentTarget.value);
                  setPage(1);
                }}
                className={input}
              />
            </div>
          </>
        )}
        <div>
          <Label htmlFor="report-yacht">Yacht</Label>
          <SearchSelect
            id="report-yacht"
            value={filters.yacht_id ?? ""}
            onChange={(v) => setFilter("yacht_id", v)}
            load={searchYachts()}
            resolve={resolveYacht}
            clearable
            emptyLabel="All yachts"
            placeholder="Search yachts by name"
            noResults="No yacht matches."
          />
        </div>
        <div>
          <Label htmlFor="report-ownership">Ownership</Label>
          <SelectBox
            id="report-ownership"
            value={filters.ownership ?? ""}
            onChange={(v) => setFilter("ownership", v)}
            options={[
              { value: "", label: "Own and partner" },
              { value: "own", label: "Own yachts" },
              { value: "partner", label: "Partner yachts" },
            ]}
          />
        </div>
        <div>
          <Label htmlFor="report-partner">Partner</Label>
          <SearchSelect
            id="report-partner"
            value={filters.partner_id ?? ""}
            onChange={(v) => setFilter("partner_id", v)}
            load={searchPartners()}
            resolve={resolvePartner}
            clearable
            emptyLabel="All partners"
            placeholder="Search partners by name"
            noResults="No partner matches."
          />
        </div>
        {allowed.includes("status") && (
          <div>
            <Label htmlFor="report-status">Status</Label>
            <SelectBox
              id="report-status"
              value={filters.status ?? ""}
              onChange={(v) => setFilter("status", v)}
              options={[
                { value: "", label: "Every status" },
                ...BOOKING_STATUSES.map((s) => ({ value: s, label: valueLabel(s) })),
              ]}
            />
          </div>
        )}
        {allowed.includes("source") && (
          <div>
            <Label htmlFor="report-source">Source</Label>
            <SelectBox
              id="report-source"
              value={filters.source ?? ""}
              onChange={(v) => setFilter("source", v)}
              options={[
                { value: "", label: "Online and office" },
                { value: "online", label: "Online" },
                { value: "office", label: "Office" },
              ]}
            />
          </div>
        )}
        {allowed.includes("payout_status") && (
          <div>
            <Label htmlFor="report-payout">Payout</Label>
            <SelectBox
              id="report-payout"
              value={filters.payout_status ?? ""}
              onChange={(v) => setFilter("payout_status", v)}
              options={[
                { value: "", label: "Paid and unpaid" },
                { value: "paid", label: "Paid" },
                { value: "unpaid", label: "Unpaid" },
              ]}
            />
          </div>
        )}
      </div>

      <InfoPanel title={`${REPORT_LABEL[type]} report`} className="mt-[22px]">
        {periodText(from, to)} · {NOTES[type]}
      </InfoPanel>

      <section aria-labelledby="report-summary" className="mt-[26px]">
        <h2 id="report-summary" className="sr-only">
          Summary
        </h2>
        {customInvalid ? (
          <p role="alert" className="text-[12px]">
            Choose a start and an end date; the end can’t be before the start.
          </p>
        ) : !data ? (
          <LoadState
            loading={report.loading}
            error={
              report.error
                ? `Couldn't load the report. ${reportErrorMessage(report.error)}`
                : undefined
            }
            onRetry={report.reload}
            label="Loading report"
          />
        ) : (
          <div className={cx(report.loading && "opacity-60")}>
            <Summary type={type} report={data} />
            {data.filters.length > 0 && (
              <p className="mt-[14px] text-[11px]" style={{ color: MUTED }}>
                Filters: {data.filters.map((f) => `${f.label} ${f.value}`).join(" · ")}
              </p>
            )}
          </div>
        )}
      </section>

      {data && !customInvalid && (
        <section aria-labelledby="report-rows" className="mt-[30px]">
          <div className="mb-[12px] flex flex-wrap items-end justify-between gap-[12px]">
            <h2 id="report-rows" className="text-[20px] leading-[26px]">
              {data.title}
            </h2>
            <ExportButtons type={type} query={query} />
          </div>
          <ReportRows
            caption={data.title}
            columns={data.columns}
            items={data.items}
            dimmed={report.loading}
          />
          <Pager
            page={page}
            total={data.total}
            limit={PAGE_SIZE}
            busy={report.loading}
            onPage={setPage}
          />
        </section>
      )}
    </div>
  );
}
