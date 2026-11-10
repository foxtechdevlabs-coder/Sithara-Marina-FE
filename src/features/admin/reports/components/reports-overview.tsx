"use client";

import Link from "next/link";
import { useState } from "react";

import { RevenueChart } from "@/components/admin/admin-dashboard";
import { BODY, SAND } from "@/components/admin/admin-theme";
import {
  Label,
  LoadState,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { searchPartners, searchYachts } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  SegmentTabs,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { marinaToday } from "@/features/admin/bookings/utils/booking-format";
import { formatCompactRupees } from "@/features/admin/dashboard/utils/dashboard-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import { getReport, type ReportQuery } from "@/services/admin/reports.service";

import { hoursText, periodOptions, periodText, reportErrorMessage } from "../utils/report-format";

type Tab = "revenue" | "bookings" | "utilisation";

interface Scope {
  /** "y:<id>" or "p:<id>"; "" for everything. */
  value: string;
  label: string;
}

const card = "border border-[#e3e1dc] bg-white px-[20px] pt-[22px] pb-[20px]";

function Tile({ title, caption, value }: { title: string; caption: string; value: string }) {
  return (
    <div className={card}>
      <h2 className="text-[20px] leading-[26px]">{title}</h2>
      <p className="mt-[8px] text-[12px] leading-[16px]" style={{ color: BODY }}>
        {caption}
      </p>
      <p className="mt-[14px] text-[32px] leading-[38px] tracking-[-0.5px]">{value}</p>
    </div>
  );
}

interface YachtRow {
  id: string;
  name: string;
  bookings: number;
  revenue?: number;
  percent?: number;
  bookedMinutes?: number;
  availableMinutes?: number;
  byStatus?: Record<string, number>;
}

/**
 * Reports: "A clearer perspective." (admin Figma A23). Collected revenue,
 * completed charters and utilisation for a period, a yacht or a partner,
 * revenue by weekday and a per-yacht table. Data: GET /admin/reports/revenue,
 * /bookings and /utilisation.
 */
export function ReportsOverview() {
  const [periods] = useState(() =>
    periodOptions(marinaToday()).map((p) => ({
      ...p,
      label: /^\d{4}-\d{2}$/.test(p.key) ? periodText(p.from, p.to) : p.label,
    })),
  );
  const [periodKey, setPeriodKey] = useState(periods[0]!.key);
  const [scope, setScope] = useState<Scope>({ value: "", label: "" });
  const [tab, setTab] = useState<Tab>("revenue");
  const period = periods.find((p) => p.key === periodKey) ?? periods[0]!;

  const filter = scope.value.startsWith("y:")
    ? { yacht_id: scope.value.slice(2) }
    : scope.value.startsWith("p:")
      ? { partner_id: scope.value.slice(2) }
      : {};
  const base: ReportQuery = { from: period.from, to: period.to, ...filter };
  const key = JSON.stringify(base);

  const revenue = useAdminQuery(
    (s) => getReport("revenue", { ...base, limit: 1 }, s),
    `ov-revenue:${key}`,
  );
  const bookings = useAdminQuery(
    (s) => getReport("bookings", { ...base, limit: 1 }, s),
    `ov-bookings:${key}`,
  );
  const utilisation = useAdminQuery(
    (s) => getReport("utilisation", { ...base, limit: 100 }, s),
    `ov-util:${key}`,
  );

  const rs = revenue.error ? undefined : revenue.data?.summary;
  const bs = bookings.error ? undefined : bookings.data?.summary;
  const us = utilisation.error ? undefined : utilisation.data;
  const collected = rs ? (rs.net_amount ?? rs.collected_amount) : undefined;

  // Per yacht, joined across the three reports.
  const rows = new Map<string, YachtRow>();
  const row = (id: string, name: string) => {
    let r = rows.get(id);
    if (!r) rows.set(id, (r = { id, name, bookings: 0 }));
    return r;
  };
  for (const y of rs?.by_yacht ?? [])
    Object.assign(row(y.yacht_id, y.yacht_name), { bookings: y.bookings, revenue: y.gross_amount });
  for (const y of bs?.by_yacht ?? []) {
    const r = row(y.yacht_id, y.yacht_name);
    r.byStatus = y.by_status;
    if (tab === "bookings") r.bookings = y.bookings;
  }
  for (const item of us?.items ?? []) {
    const r = row(String(item.yacht_id), String(item.yacht_name));
    r.percent = Number(item.percent);
    r.bookedMinutes = Number(item.booked_minutes);
    r.availableMinutes = Number(item.available_minutes);
    if (tab === "utilisation") r.bookings = Number(item.bookings);
  }
  const list = [...rows.values()].sort((a, b) =>
    tab === "revenue"
      ? (b.revenue ?? 0) - (a.revenue ?? 0)
      : tab === "utilisation"
        ? (b.percent ?? 0) - (a.percent ?? 0)
        : b.bookings - a.bookings,
  );

  const table = tab === "revenue" ? revenue : tab === "bookings" ? bookings : utilisation;
  const head =
    tab === "revenue"
      ? ["Yacht", "Bookings", "Revenue", "Utilisation"]
      : tab === "bookings"
        ? ["Yacht", "Bookings", "Confirmed", "Completed", "Cancelled"]
        : ["Yacht", "Charters", "Booked", "Available", "Utilisation"];
  const cells = (r: YachtRow): string[] => {
    const pct = r.percent === undefined ? "—" : `${Number(r.percent.toFixed(1))}%`;
    if (tab === "revenue")
      return [
        r.name,
        String(r.bookings),
        r.revenue === undefined ? "—" : formatCompactRupees(r.revenue),
        pct,
      ];
    if (tab === "bookings") {
      const s = r.byStatus ?? {};
      return [
        r.name,
        String(r.bookings),
        String(s.confirmed ?? 0),
        String(s.completed ?? 0),
        String((s.cancelled ?? 0) + (s.refunded ?? 0)),
      ];
    }
    return [
      r.name,
      String(r.bookings),
      r.bookedMinutes === undefined ? "—" : hoursText(r.bookedMinutes),
      r.availableMinutes === undefined ? "—" : hoursText(r.availableMinutes),
      pct,
    ];
  };

  const scopeLabel = scope.value ? scope.label : "All yachts and partners";
  const busy = revenue.loading || bookings.loading || utilisation.loading;

  return (
    <div className={pagePadding}>
      <PageHeader
        title="A clearer perspective."
        subtitle="Reports for bookings, revenue, commissions, payouts and yacht utilisation."
      />

      <div className="mt-[24px] grid gap-x-[18px] gap-y-[18px] lg:mt-[30px] lg:max-w-[580px] lg:grid-cols-2">
        <div>
          <Label htmlFor="report-period">Reporting period</Label>
          <SelectBox
            id="report-period"
            value={periodKey}
            onChange={setPeriodKey}
            options={periods.map((p) => ({ value: p.key, label: p.label }))}
          />
        </div>
        <div>
          <Label htmlFor="report-scope">Yacht / partner</Label>
          <SearchSelect<Scope>
            id="report-scope"
            value={scope.value}
            selectedLabel={scope.label || undefined}
            onChange={(_, option) => setScope(option?.data ?? { value: "", label: "" })}
            load={async (search, signal) => {
              const [y, p] = await Promise.all([
                searchYachts()(search, signal),
                searchPartners()(search, signal),
              ]);
              return {
                options: [
                  ...y.options.map((o) => ({
                    value: `y:${o.value}`,
                    label: o.label,
                    description: "Yacht",
                    data: { value: `y:${o.value}`, label: o.data!.name },
                  })),
                  ...p.options.map((o) => ({
                    value: `p:${o.value}`,
                    label: o.label,
                    description: "Partner · all their yachts",
                    data: { value: `p:${o.value}`, label: `${o.data!.name} (partner)` },
                  })),
                ],
                hasMore: y.hasMore || p.hasMore,
              };
            }}
            clearable
            emptyLabel="All yachts and partners"
            placeholder="Search yachts or partners"
            noResults="No yacht or partner matches."
          />
        </div>
      </div>

      <div className="mt-[26px]">
        <SegmentTabs
          label="Report"
          value={tab}
          onChange={setTab}
          options={[
            { value: "revenue", label: "Revenue" },
            { value: "bookings", label: "Bookings" },
            { value: "utilisation", label: "Utilisation" },
          ]}
        />
      </div>

      <div
        className={cx(
          "mt-[22px] grid gap-[16px] lg:grid-cols-3 lg:gap-[18px]",
          busy && "opacity-70",
        )}
      >
        <Tile
          title="Collected revenue"
          caption="Captured payments less verified refunds"
          value={
            collected === undefined || collected === null ? "—" : formatCompactRupees(collected)
          }
        />
        <Tile
          title="Completed charters"
          caption="Selected departure period"
          value={bs ? String(bs.by_status.completed ?? 0) : "—"}
        />
        <Tile
          title="Available-hour utilisation"
          caption="Booked hours / available hours"
          value={us ? `${Number(us.summary.percent.toFixed(1))}%` : "—"}
        />
      </div>
      {Boolean(revenue.error || bookings.error || utilisation.error) && !busy && (
        <p role="alert" className="mt-[10px] text-[12px]">
          Some figures couldn’t load.{" "}
          {reportErrorMessage(revenue.error ?? bookings.error ?? utilisation.error)}{" "}
          <button
            type="button"
            onClick={() => {
              revenue.reload();
              bookings.reload();
              utilisation.reload();
            }}
            className="underline"
          >
            Try again
          </button>
        </p>
      )}

      {tab === "revenue" && (
        <div className="mt-[18px]">
          <RevenueChart period={period} filter={filter} />
        </div>
      )}

      <div className="mt-[22px]">
        {!table.data && (table.loading || table.error) ? (
          <LoadState
            loading={table.loading}
            error={
              table.error
                ? `Couldn't load the report. ${reportErrorMessage(table.error)}`
                : undefined
            }
            onRetry={table.reload}
            label="Loading report"
          />
        ) : !list.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            No yachts with activity in this period.
          </p>
        ) : (
          <div className={cx(table.loading && "opacity-60")}>
            <table className="hidden w-full border-collapse text-left text-[11px] lg:table">
              <caption className="sr-only">
                {tab} by yacht, {period.label}
              </caption>
              <thead>
                <tr style={{ backgroundColor: SAND }}>
                  {head.map((h) => (
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
                {list.map((r) => (
                  <tr key={r.id} className="border-b border-[#ebe9e4]">
                    {cells(r).map((c, i) => (
                      <td
                        key={i}
                        className={cx(
                          "px-[12px] py-[12px]",
                          i === 0 ? "break-words" : "tabular-nums",
                        )}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="grid gap-[14px] lg:hidden">
              {list.map((r) => {
                const values = cells(r);
                return (
                  <li key={r.id} className={card}>
                    <p className="text-[20px] leading-[26px] break-words">{values[0]}</p>
                    <dl className="mt-[6px] text-[13px]">
                      {head.slice(1).map((h, i) => (
                        <div key={h} className="mt-[10px]">
                          <dt className="text-[11px]" style={{ color: BODY }}>
                            {h}
                          </dt>
                          <dd>{values[i + 1]}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-[24px] flex flex-wrap gap-[14px]">
        <Link
          href={adminRoutes.reportExport(
            tab,
            period.from,
            period.to,
            filter.yacht_id ?? "",
            filter.partner_id ?? "",
            scope.value ? scope.label : "",
          )}
          className={cx(smallPrimary, "min-w-[160px]")}
          style={PRIMARY_STYLE}
        >
          Export current report
        </Link>
        <Link
          href={adminRoutes.reportsDetailed("commission")}
          className={cx(smallOutline, "min-w-[180px]")}
          style={OUTLINE_STYLE}
        >
          Commission & payout reports
        </Link>
      </div>

      <InfoPanel title="Report definitions" className="mt-[24px]">
        Payment-date revenue and departure-date booking reports use different dates. Taxes, refunds
        and unavailable hours are shown consistently in exported definitions. Showing: {scopeLabel}{" "}
        · {period.label}.
      </InfoPanel>
    </div>
  );
}
