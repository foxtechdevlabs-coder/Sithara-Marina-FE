"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import {
  formatCompactRupees,
  formatDepartureDate,
  formatPercent,
  pendingPaymentsText,
  recentMonths,
  type DashboardPeriod,
  statusLabel,
} from "@/features/admin/dashboard/utils/dashboard-format";
import {
  getDashboard,
  getRevenueByDay,
  type RevenueDay,
  type Dashboard,
  type DashboardCharter,
} from "@/services/admin/dashboard.service";

import { BODY, GRADIENT, INK, MUTED, NAVY, SAND } from "./admin-theme";
import { LoadState } from "./form-parts";
import { isApiError } from "@/services/http/api-error";

/*
 * Data: GET /admin/dashboard. A block the account has no permission for comes
 * back null and shows as empty; see features/admin/dashboard/README.md.
 */

const NO_DATA = "No data available";
const NO_ACCESS = "Your account doesn't have access to this.";

const card = "border border-[#e3e1dc] bg-white";
const outlineButton =
  "flex h-[47px] items-center justify-center border bg-white text-[11px] transition-colors hover:bg-[#f2f1ee]";

function Kpi({ title, caption, value }: { title: string; caption: string; value?: string }) {
  return (
    <div className={`${card} px-[20px] pt-[24px] pb-[20px]`}>
      <h2 className="text-[20px] leading-[26px]">{title}</h2>
      <p className="mt-[10px] text-[12px] leading-[16px]" style={{ color: BODY }}>
        {caption}
      </p>
      <p className="mt-[16px] text-[34px] leading-[40px] tracking-[-0.5px]">
        {value ?? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">{NO_DATA}</span>
          </>
        )}
      </p>
    </div>
  );
}

/** Bar colours from the design: sage, with the best day in navy. */
const BAR = "#6e7f5f";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const charters = (n: number) => `${n} ${n === 1 ? "charter" : "charters"}`;
/** "Wed, 18 Nov · ₹ 37,170 · 1 charter" */
const revenueLine = (d: RevenueDay) =>
  `${new Date(`${d.date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })} · ${formatCompactRupees(d.amount)} · ${charters(d.bookings)}`;

/**
 * Booked revenue (confirmed and completed charters, incl. GST) in the period,
 * by weekday of departure; the best day is navy. Added up from
 * GET /admin/reports/revenue. Needs reports:read.
 */
export function RevenueChart({
  period,
  filter = {},
}: {
  period: DashboardPeriod;
  /** Narrow to one yacht or one partner's yachts (the Reports page). */
  filter?: { yacht_id?: string; partner_id?: string };
}) {
  const query = useAdminQuery(
    (signal) => getRevenueByDay(period.from, period.to, signal, filter),
    `revenue-days:${period.from}:${period.to}:${filter.yacht_id ?? ""}:${filter.partner_id ?? ""}`,
  );
  const [hover, setHover] = useState<number | null>(null);
  const days = query.error ? undefined : query.data;
  const max = days ? Math.max(0, ...days.map((d) => d.amount)) : 0;
  const forbidden = isApiError(query.error) && query.error.status === 403;

  const empty = (text: ReactNode) => (
    <div
      className="mt-[16px] flex h-[104px] items-center justify-center border border-dashed border-[#d8d6d1] px-[12px] text-center text-[12px] lg:mt-[18px] lg:h-[158px]"
      style={{ color: MUTED }}
    >
      {text}
    </div>
  );

  let body: ReactNode;
  if (!days && query.loading) body = empty("Loading revenue…");
  else if (forbidden) body = empty(NO_ACCESS);
  else if (!days)
    body = empty(
      <span role="alert">
        Couldn’t load revenue. {fleetErrorMessage(query.error)}{" "}
        <button type="button" onClick={query.reload} className="underline">
          Try again
        </button>
      </span>,
    );
  else if (max === 0) body = empty("No confirmed charters depart in this period.");
  else {
    // The period's revenue added up by weekday, Monday first.
    const weekdays = WEEKDAYS.map((name) => ({
      name,
      amount: 0,
      bookings: 0,
      dates: [] as RevenueDay[],
    }));
    for (const d of days) {
      const w = weekdays[(new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7]!;
      w.amount += d.amount;
      w.bookings += d.bookings;
      if (d.amount > 0) w.dates.push(d);
    }
    const top = Math.max(...weekdays.map((w) => w.amount));
    body = (
      <div className={`mt-[18px] lg:mt-[22px] ${query.loading ? "opacity-60" : ""}`}>
        <div
          aria-hidden="true"
          className="flex h-[120px] items-end gap-[10px] lg:h-[182px] lg:gap-[23px]"
          onMouseLeave={() => setHover(null)}
        >
          {weekdays.map((w, i) => (
            <div
              key={w.name}
              onMouseEnter={() => setHover(i)}
              className="relative flex h-full min-w-0 flex-1 items-end"
            >
              {hover === i && w.dates.length > 0 && (
                <span
                  className={`absolute bottom-full z-10 mb-[6px] ${i < 2 ? "left-0" : i > 4 ? "right-0" : "left-1/2 -translate-x-1/2"} border border-[#e3e1dc] bg-white px-[8px] py-[4px] text-[11px] leading-[17px] whitespace-nowrap shadow-sm`}
                  style={{ color: INK }}
                >
                  {w.dates.length === 1 ? (
                    revenueLine(w.dates[0]!)
                  ) : (
                    <>
                      <span className="block">
                        {w.name} · {formatCompactRupees(w.amount)} · {charters(w.bookings)}
                      </span>
                      {w.dates.map((d) => (
                        <span key={d.date} className="block" style={{ color: BODY }}>
                          {revenueLine(d)}
                        </span>
                      ))}
                    </>
                  )}
                </span>
              )}
              <span
                className="block w-full transition-opacity"
                style={{
                  height: w.amount > 0 ? `${Math.max(2, (w.amount / top) * 100)}%` : 0,
                  backgroundColor: w.amount === top ? NAVY : BAR,
                  opacity: hover === null || hover === i ? 1 : 0.7,
                }}
              />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="mt-[10px] flex gap-[10px] lg:mt-[12px] lg:gap-[23px]">
          {weekdays.map((w) => (
            <span
              key={w.name}
              className="min-w-0 flex-1 text-[10px] tracking-[0.06em] lg:text-[11px]"
              style={{ color: BODY }}
            >
              {w.name}
            </span>
          ))}
        </div>
        <div className="sr-only">
          <table>
            <caption>Booked revenue by weekday of departure, {period.label}</caption>
            <thead>
              <tr>
                <th scope="col">Weekday</th>
                <th scope="col">Revenue</th>
                <th scope="col">Charters</th>
              </tr>
            </thead>
            <tbody>
              {weekdays.map((w) => (
                <tr key={w.name}>
                  <td>{w.name}</td>
                  <td>{formatCompactRupees(w.amount)}</td>
                  <td>{w.bookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <section className={`${card} px-[20px] pt-[24px] pb-[16px] lg:px-[20px]`}>
      <h2 className="text-[20px] leading-[26px]">Revenue over time</h2>
      <p className="mt-[10px] text-[12px] leading-[17px]" style={{ color: BODY }}>
        {period.label}
        <span aria-hidden="true" className="mx-[5px]">
          ·
        </span>
        Revenue by departure day
      </p>
      {body}
    </section>
  );
}

function UpcomingBookings({ charters }: { charters: Dashboard["charters"] | undefined }) {
  const rows = charters ? [...charters.today, ...charters.upcoming] : [];
  const message = !charters ? NO_ACCESS : NO_DATA;
  const more = charters ? charters.upcoming_total - charters.upcoming.length : 0;
  const departure = (b: DashboardCharter) => (
    <>
      {b.yacht_name}
      <span aria-hidden="true" className="mx-[5px]">
        ·
      </span>
      {formatDepartureDate(b.starts_at)}
    </>
  );

  return (
    <>
      {/* Desktop: table */}
      <table className="mt-[24px] hidden w-full border-collapse text-left text-[12px] lg:table">
        <caption className="sr-only">Upcoming bookings</caption>
        <thead style={{ backgroundColor: SAND }}>
          <tr className="text-[10px] tracking-[0.08em]" style={{ color: MUTED }}>
            <th scope="col" className="h-[41px] w-1/3 px-[13px] font-normal">
              Reference
            </th>
            <th scope="col" className="w-1/3 px-[13px] font-normal">
              Yacht / departure
            </th>
            <th scope="col" className="px-[13px] font-normal">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((b) => (
            <tr key={b.id} className="border-b border-[#e3e1dc]">
              <th scope="row" className="h-[45px] px-[13px] font-normal">
                <Link href={adminRoutes.booking(b.id)} className="hover:underline">
                  {b.reference}
                </Link>
              </th>
              <td className="px-[13px]">{departure(b)}</td>
              <td className="px-[13px]">{statusLabel(b.status)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr className="border-b border-[#e3e1dc]">
              <td colSpan={3} className="h-[45px] px-[13px]" style={{ color: BODY }}>
                {message}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Phones and tablets: one card per booking */}
      <ul className="mt-[20px] flex flex-col gap-[16px] lg:hidden">
        {rows.map((b) => (
          <li key={b.id} className={`${card} px-[20px] pt-[22px] pb-[20px]`}>
            <h3 className="text-[20px] leading-[26px] tracking-[0.02em]">{b.reference}</h3>
            <dl className="mt-[10px] text-[14px] leading-[20px]">
              <dt className="text-[12px]" style={{ color: BODY }}>
                Yacht / departure
              </dt>
              <dd className="mt-[4px]">{departure(b)}</dd>
              <dt className="mt-[12px] text-[12px]" style={{ color: BODY }}>
                Status
              </dt>
              <dd className="mt-[4px]">{statusLabel(b.status)}</dd>
            </dl>
            <Link
              href={adminRoutes.booking(b.id)}
              className={`${outlineButton} mt-[14px] w-[148px] gap-[4px]`}
              style={{ borderColor: INK }}
            >
              View details
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[11px]" />
              <span className="sr-only">for {b.reference}</span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className={`${card} px-[20px] py-[20px] text-[14px]`} style={{ color: BODY }}>
            Upcoming bookings: {message.toLowerCase()}
          </li>
        )}
      </ul>

      {more > 0 && (
        <p className="mt-[10px] text-[12px]" style={{ color: BODY }}>
          {more} more upcoming {more === 1 ? "charter" : "charters"}.{" "}
          <Link href={adminRoutes.bookings} className="underline underline-offset-2">
            All bookings
          </Link>
        </p>
      )}
    </>
  );
}

function NeedsAttention({ data }: { data: Dashboard | undefined }) {
  const pending = data?.pending_payments;
  const alerts = data?.alerts;
  const count = (pending?.count ? 1 : 0) + (alerts?.length ?? 0);
  return (
    <section
      aria-label="Needs attention"
      className="px-[17px] pt-[18px] pb-[20px]"
      style={{ backgroundColor: SAND }}
    >
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        {!pending || !alerts
          ? "Needs attention"
          : count
            ? `${count} ${count === 1 ? "item needs" : "items need"} attention`
            : "Nothing needs attention"}
      </p>
      {data && (!pending || !alerts) && (
        <p className="mt-[8px] text-[12px] leading-[18px]">{NO_ACCESS}</p>
      )}
      {!data && <p className="mt-[8px] text-[12px] leading-[18px]">{NO_DATA}</p>}
      {count > 0 && (
        <ul className="mt-[8px] text-[12px] leading-[18px]">
          {pending && pending.count > 0 && (
            <li>
              <Link href={adminRoutes.bookings} className="hover:underline">
                {pendingPaymentsText(pending)}
              </Link>
            </li>
          )}
          {alerts?.map((a) => (
            <li key={`${a.type}-${a.booking_id}`}>
              <Link href={adminRoutes.booking(a.booking_id)} className="hover:underline">
                {a.message}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Admin overview ("A clear view of today."), built from the admin Figma
 * design. Data: GET /admin/dashboard for the selected reporting period.
 */
export default function AdminDashboard() {
  const [periods] = useState(recentMonths);
  const [periodIndex, setPeriodIndex] = useState(0);
  const period = periods[periodIndex] ?? periods[0]!;
  const query = useAdminQuery(
    (signal) => getDashboard({ from: period.from, to: period.to }, signal),
    period.from,
  );
  // Never show another period's figures next to an error.
  const data = query.error ? undefined : query.data;
  const refreshing = query.loading && Boolean(data);

  return (
    <div className="px-[20px] pt-[20px] pb-[48px] lg:pt-[33px] lg:pr-[48px] lg:pb-[47px] lg:pl-[46px]">
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>
      <h1 className="mt-[18px] text-[30px] leading-[1.15] font-normal tracking-[-0.8px] lg:mt-[28px] lg:text-[43px] lg:tracking-[-1.3px]">
        A clear view of today.
      </h1>
      <p className="mt-[16px] text-[12px] leading-[19px] lg:mt-[28px]" style={{ color: BODY }}>
        Bookings, journeys and the details that need your attention.
      </p>
      <label
        htmlFor="period"
        className="mt-[28px] block text-[10px] lg:mt-[37px]"
        style={{ color: BODY }}
      >
        Reporting period
      </label>
      <div className="relative mt-[8px] w-full lg:w-[466px]">
        <select
          id="period"
          value={periodIndex}
          onChange={(e) => setPeriodIndex(Number(e.currentTarget.value))}
          className="h-[48px] w-full cursor-pointer appearance-none border border-[#d8d6d1] bg-white px-[14px] pr-10 text-[13px] outline-none focus:border-[#0d1b2a]"
        >
          {periods.map((p, i) => (
            <option key={p.from} value={i}>
              {p.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.5}
          className="pointer-events-none absolute top-1/2 right-[14px] size-4 -translate-y-1/2 text-[#9aa0a6]"
        />
      </div>

      {query.error || (query.loading && !data) ? (
        <LoadState
          loading={query.loading}
          label="Loading the dashboard"
          error={
            query.error ? `Couldn't load the dashboard. ${fleetErrorMessage(query.error)}` : ""
          }
          onRetry={query.reload}
        />
      ) : null}

      <div
        aria-busy={query.loading}
        className={`mt-[40px] grid gap-[16px] md:grid-cols-3 lg:mt-[48px] ${refreshing ? "opacity-60" : ""}`}
      >
        <Kpi
          title="Confirmed bookings"
          caption="Selected period"
          value={data?.activity ? String(data.activity.confirmed) : undefined}
        />
        <Kpi
          title="Revenue booked"
          caption="Confirmed and completed charters, incl. GST"
          value={data?.revenue ? formatCompactRupees(data.revenue.booked_amount) : undefined}
        />
        <Kpi
          title="Utilisation"
          caption="Booked available hours"
          value={data?.utilisation ? formatPercent(data.utilisation.percent) : undefined}
        />
      </div>

      <div className="mt-[20px] grid gap-[24px] lg:mt-[27px] lg:grid-cols-[minmax(0,743fr)_minmax(0,333fr)] lg:gap-[54px]">
        <div>
          <RevenueChart period={period} />
          <UpcomingBookings
            charters={data ? data.charters : { today: [], upcoming: [], upcoming_total: 0 }}
          />
        </div>

        <div>
          <NeedsAttention data={data} />

          <div className="mt-[20px] flex flex-col items-start gap-[20px]">
            <Link
              href={adminRoutes.bookings}
              className="flex h-[47px] w-[147px] items-center justify-center text-[11px] transition-opacity hover:opacity-90"
              style={{ background: GRADIENT }}
            >
              Review bookings
            </Link>
            <Link
              href={adminRoutes.enquiries}
              className={`${outlineButton} w-[147px]`}
              style={{ borderColor: INK }}
            >
              Review enquiries
            </Link>
            <Link
              href={adminRoutes.bookingNew}
              className={`${outlineButton} w-[164px]`}
              style={{ borderColor: INK }}
            >
              Create office booking
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
