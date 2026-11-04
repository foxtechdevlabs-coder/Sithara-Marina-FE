"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { adminRoutes } from "@/constants/routes";

import { BODY, GRADIENT, INK, MUTED, SAND } from "./admin-theme";

/* ------------------------------------------------------------------ */
/* DUMMY data: replace with the admin reporting API once it is ready.  */
/* ------------------------------------------------------------------ */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface Period {
  label: string;
  confirmed: number;
  revenue: string;
  utilisation: string;
  /** Revenue per departure weekday, in lakh rupees. */
  revenueByDay: number[];
  attention: string[];
}

const PERIODS: Period[] = [
  {
    label: "01–30 November 2026",
    confirmed: 24,
    revenue: "₹ 28.6L",
    utilisation: "68%",
    revenueByDay: [2.1, 3.4, 2.7, 4.7, 3.7, 5.4, 6.5],
    attention: ["1 cancellation request", "1 pending payment", "1 proposal awaiting a reply"],
  },
  {
    label: "01–31 October 2026",
    confirmed: 19,
    revenue: "₹ 22.4L",
    utilisation: "61%",
    revenueByDay: [1.8, 2.6, 2.2, 3.5, 3.1, 4.4, 4.8],
    attention: ["2 pending payments"],
  },
  {
    label: "01–30 September 2026",
    confirmed: 12,
    revenue: "₹ 14.9L",
    utilisation: "44%",
    revenueByDay: [1.1, 1.6, 1.4, 2.3, 2.0, 3.0, 3.5],
    attention: [],
  },
];

const BOOKINGS = [
  { ref: "SM-1048", yacht: "Astra One", date: "12 Nov", status: "Confirmed" },
  { ref: "SM-1049", yacht: "Malabar", date: "13 Nov", status: "Awaiting payment" },
  { ref: "SM-1050", yacht: "Neelam", date: "14 Nov", status: "Confirmed" },
];

/* ------------------------------------------------------------------ */

const card = "border border-[#e3e1dc] bg-white";
const outlineButton =
  "flex h-[47px] items-center justify-center border bg-white text-[11px] transition-colors hover:bg-[#f2f1ee]";

function Kpi({ title, caption, value }: { title: string; caption: string; value: string }) {
  return (
    <div className={`${card} px-[20px] pt-[24px] pb-[20px]`}>
      <h2 className="text-[20px] leading-[26px]">{title}</h2>
      <p className="mt-[10px] text-[12px] leading-[16px]" style={{ color: BODY }}>
        {caption}
      </p>
      <p className="mt-[16px] text-[34px] leading-[40px] tracking-[-0.5px]">{value}</p>
    </div>
  );
}

function RevenueChart({ period }: { period: Period }) {
  const max = Math.max(...period.revenueByDay);
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

      <figure className="mt-[16px] lg:mt-[18px]">
        <div
          aria-hidden="true"
          className="flex h-[104px] items-end gap-[8px] lg:h-[158px] lg:gap-[20px]"
        >
          {period.revenueByDay.map((value, i) => (
            <div
              key={DAYS[i]}
              title={`${DAYS[i]}: ₹ ${value.toFixed(1)}L`}
              className="flex-1 transition-[height] duration-500 ease-out motion-reduce:transition-none"
              style={{
                height: `${(value / max) * 100}%`,
                backgroundColor: i === period.revenueByDay.length - 1 ? "#0a1a2c" : "#6b7d5f",
              }}
            />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="mt-[8px] flex gap-[8px] text-[10px] tracking-[0.06em] lg:gap-[20px]"
          style={{ color: MUTED }}
        >
          {DAYS.map((d) => (
            <span key={d} className="flex-1 max-lg:text-center">
              {d}
            </span>
          ))}
        </div>
        {/* Screen-reader version of the chart. */}
        <figcaption className="sr-only">
          Revenue by departure day:{" "}
          {period.revenueByDay.map((v, i) => `${DAYS[i]} ₹ ${v.toFixed(1)} lakh`).join(", ")}.
        </figcaption>
      </figure>
    </section>
  );
}

function RecentBookings() {
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
          {BOOKINGS.map((b) => (
            <tr key={b.ref} className="border-b border-[#e3e1dc]">
              <th scope="row" className="h-[45px] px-[13px] font-normal">
                <Link href={adminRoutes.booking(b.ref)} className="hover:underline">
                  {b.ref}
                </Link>
              </th>
              <td className="px-[13px]">
                {b.yacht}
                <span aria-hidden="true" className="mx-[5px]">
                  ·
                </span>
                {b.date}
              </td>
              <td className="px-[13px]">{b.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phones and tablets: one card per booking */}
      <ul className="mt-[20px] flex flex-col gap-[16px] lg:hidden">
        {BOOKINGS.map((b) => (
          <li key={b.ref} className={`${card} px-[20px] pt-[22px] pb-[20px]`}>
            <h3 className="text-[20px] leading-[26px] tracking-[0.02em]">{b.ref}</h3>
            <dl className="mt-[10px] text-[14px] leading-[20px]">
              <dt className="text-[12px]" style={{ color: BODY }}>
                Yacht / departure
              </dt>
              <dd className="mt-[4px]">
                {b.yacht}
                <span aria-hidden="true" className="mx-[5px]">
                  ·
                </span>
                {b.date}
              </dd>
              <dt className="mt-[12px] text-[12px]" style={{ color: BODY }}>
                Status
              </dt>
              <dd className="mt-[4px]">{b.status}</dd>
            </dl>
            <Link
              href={adminRoutes.booking(b.ref)}
              className={`${outlineButton} mt-[14px] w-[148px] gap-[4px]`}
              style={{ borderColor: INK }}
            >
              View details
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[11px]" />
              <span className="sr-only">for {b.ref}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Admin overview ("A clear view of today."), built from the admin Figma
 * design. Renders dummy figures until the reporting API is ready.
 */
export default function AdminDashboard() {
  const [periodIndex, setPeriodIndex] = useState(0);
  const period = PERIODS[periodIndex] ?? PERIODS[0]!;

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
          {PERIODS.map((p, i) => (
            <option key={p.label} value={i}>
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

      <div className="mt-[40px] grid gap-[16px] md:grid-cols-3 lg:mt-[48px]">
        <Kpi
          title="Confirmed bookings"
          caption="Selected period"
          value={String(period.confirmed)}
        />
        <Kpi title="Revenue collected" caption="Captured payments" value={period.revenue} />
        <Kpi title="Utilisation" caption="Booked available hours" value={period.utilisation} />
      </div>

      <div className="mt-[20px] grid gap-[24px] lg:mt-[27px] lg:grid-cols-[minmax(0,743fr)_minmax(0,333fr)] lg:gap-[54px]">
        <div>
          <RevenueChart period={period} />
          <RecentBookings />
        </div>

        <div>
          <section
            aria-label="Needs attention"
            className="px-[17px] pt-[18px] pb-[20px]"
            style={{ backgroundColor: SAND }}
          >
            <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
              {period.attention.length
                ? `${period.attention.length} ${period.attention.length === 1 ? "item needs" : "items need"} attention`
                : "Nothing needs attention"}
            </p>
            {period.attention.length > 0 && (
              <ul className="mt-[8px] text-[12px] leading-[18px]">
                {period.attention.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
          </section>

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
