"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BODY, MUTED, NAVY, SAND } from "@/components/admin/admin-theme";
import {
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { resolveYacht, searchYachts } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import {
  bookingStatusLabel,
  marinaToday,
  monthLabel,
  monthRange,
  shiftMonth,
  shortDate,
  slotText,
} from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import { getYachtAvailability, type CalendarYacht } from "@/services/admin/availability.service";
import { listYachts } from "@/services/admin/fleet.service";

import {
  availabilityErrorMessage,
  blockKindLabel,
  blockTimeOnDay,
  localParts,
} from "../utils/availability-format";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const NOTICES: Record<string, string> = {
  "block-saved": "Availability block saved. That time can no longer be booked.",
  "block-removed": "Availability block removed. That time is bookable again.",
};

interface Entry {
  key: string;
  date: string;
  /** Sort key within the day. */
  sort: string;
  time: string;
  label: string;
  href?: Route;
  /** Link text on phones, e.g. "View details". */
  action?: string;
}

/** The rows under the calendar: every booking, hold and block of the month, plus the selected day's free windows. */
function monthEntries(
  yacht: CalendarYacht,
  days: string[],
  selected: string,
  timeZone: string,
): Entry[] {
  const entries: Entry[] = [];
  for (const b of yacht.bookings) {
    entries.push({
      key: `b-${b.id}`,
      date: b.date,
      sort: b.start_time,
      time: slotText(b),
      label: `${bookingStatusLabel(b.status)} · ${b.reference}`,
      href: adminRoutes.booking(b.id),
      action: "View details",
    });
  }
  for (const h of yacht.holds) {
    entries.push({
      key: `h-${h.id}`,
      date: h.date,
      sort: h.start_time,
      time: slotText(h),
      label: `Payment hold · free again at ${localParts(h.expires_at, timeZone).time} if unpaid`,
    });
  }
  for (const block of yacht.blocks) {
    for (const day of days) {
      const time = blockTimeOnDay(block, day, timeZone);
      if (!time) continue;
      entries.push({
        key: `k-${block.id}-${day}`,
        date: day,
        sort: time.startsWith("From ")
          ? time.slice(5)
          : /^\d/.test(time)
            ? time.slice(0, 5)
            : "00:00", // "All day", "Until …"
        time,
        label: blockKindLabel(block.reason),
        href: adminRoutes.availabilityBlock(block.id),
        action: "View details",
      });
    }
  }
  for (const w of yacht.free_windows) {
    if (w.date !== selected) continue;
    entries.push({
      key: `w-${w.slot_type_id}-${w.start_time}`,
      date: w.date,
      sort: `${w.start_time}~`,
      time: slotText(w),
      label: `Available · ${w.slot_type_name}`,
      href: adminRoutes.bookingNew,
      action: "Create booking",
    });
  }
  return entries
    .filter((e) => days.includes(e.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.sort.localeCompare(b.sort));
}

/**
 * Availability: "Room for every journey." One yacht's month from
 * GET /admin/calendar: bookings, payment holds, blocks and free windows.
 */
export function AvailabilityCalendar({
  initialYacht = "",
  initialMonth = "",
  initialDate = "",
  notice = "",
}: {
  initialYacht?: string;
  initialMonth?: string;
  initialDate?: string;
  notice?: string;
}) {
  const router = useRouter();
  const today = marinaToday();
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : "";
  const validMonth = /^\d{4}-\d{2}$/.test(initialMonth) ? initialMonth : "";
  const [picked, setPicked] = useState(initialYacht);
  const [month, setMonth] = useState(validMonth || validDate.slice(0, 7) || today.slice(0, 7));
  const [selected, setSelected] = useState(validDate);

  // Without a chosen yacht, open on the first active one (and tell an empty fleet apart).
  const yachts = useAdminQuery(
    (signal) =>
      listYachts({ limit: 1, status: "active" }, signal).then((r) =>
        r.items.length ? r : listYachts({ limit: 1 }, signal),
      ),
    "avail-default-yacht",
  );
  const yachtList = yachts.data?.items ?? [];
  const yachtId = picked || (yachtList[0]?.id ?? "");

  const range = monthRange(month);
  const calendar = useAdminQuery(
    (signal) =>
      yachtId ? getYachtAvailability(yachtId, range.from, range.to, signal) : Promise.resolve(null),
    `avail:${yachtId}:${month}`,
  );

  const days = Array.from(
    { length: Number(range.to.slice(8)) },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
  // The selected day, or today / the first day when it isn't in this month.
  const day = days.includes(selected) ? selected : days.includes(today) ? today : days[0]!;

  const timeZone = calendar.data?.timezone ?? "Asia/Kolkata";
  const yacht = calendar.data?.yacht ?? null;
  const freeDays = new Set(yacht?.free_windows.map((w) => w.date));
  const blockedDays = new Set(
    yacht ? days.filter((d) => yacht.blocks.some((b) => blockTimeOnDay(b, d, timeZone))) : [],
  );
  const unavailable = yacht
    ? days.filter((d) => blockedDays.has(d) || (d >= today && !freeDays.has(d)))
    : [];
  const entries = yacht ? monthEntries(yacht, days, day, timeZone) : [];

  function sync(next: { yacht?: string; month?: string; date?: string }) {
    const q = { yacht: yachtId, month, date: day, ...next };
    router.replace(adminRoutes.availabilityFor(q.yacht, q.month, q.date), { scroll: false });
  }
  function changeMonth(value: string) {
    setMonth(value);
    sync({ month: value, date: "" });
  }
  function pickDay(value: string) {
    setSelected(value);
    sync({ date: value });
  }

  const firstWeekday = (new Date(`${range.from}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monthOptions = Array.from({ length: 19 }, (_, i) => shiftMonth(today.slice(0, 7), i - 6));
  if (!monthOptions.includes(month)) monthOptions.push(month);
  monthOptions.sort();

  if (!yachts.data) {
    return (
      <div className={pagePadding}>
        <PageHeader title="Room for every journey." />
        <div className="mt-[24px]">
          <LoadState
            loading={yachts.loading}
            error={
              yachts.error
                ? `Couldn't load the fleet. ${availabilityErrorMessage(yachts.error)}`
                : undefined
            }
            onRetry={yachts.reload}
            label="Loading the fleet"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Room for every journey."
        subtitle="Availability management · All charter times are local to the departure region."
      />

      {NOTICES[notice] && <Notice className="mt-[20px] lg:max-w-[880px]">{NOTICES[notice]}</Notice>}

      {!yachtList.length && !picked ? (
        <p className="mt-[24px] text-[14px]" style={{ color: BODY }}>
          There are no yachts yet.{" "}
          <Link href={adminRoutes.fleetNew} className="underline underline-offset-2">
            Add a yacht
          </Link>{" "}
          to manage its availability.
        </p>
      ) : (
        <>
          <div className="mt-[24px] grid gap-x-[18px] gap-y-[20px] lg:mt-[30px] lg:max-w-[580px] lg:grid-cols-2">
            <div>
              <Label htmlFor="avail-yacht">Yacht</Label>
              <SearchSelect
                id="avail-yacht"
                value={yachtId}
                onChange={(v) => {
                  if (!v) return;
                  setPicked(v);
                  sync({ yacht: v });
                }}
                load={searchYachts()}
                resolve={resolveYacht}
                selectedLabel={yachtList.find((y) => y.id === yachtId)?.name}
                placeholder="Search yachts by name"
                noResults="No yacht matches."
              />
            </div>
            <div>
              <Label htmlFor="avail-month">View</Label>
              <SelectBox
                id="avail-month"
                value={month}
                onChange={changeMonth}
                options={monthOptions.map((m) => ({ value: m, label: monthLabel(m) }))}
              />
            </div>
          </div>

          {/* Month */}
          <div className="mt-[30px] border border-[#dcdad5] bg-white px-[14px] py-[20px] lg:max-w-[880px] lg:px-[18px] lg:py-[24px]">
            <h2 className="text-[22px] leading-[28px] lg:text-[26px]">{monthLabel(month)}</h2>
            <p className="mt-[8px] text-[9px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
              All charter times · {timeZone}
            </p>

            {calendar.error && !calendar.loading ? (
              <p role="alert" className="mt-[16px] text-[12px]">
                Couldn’t load availability. {availabilityErrorMessage(calendar.error)}{" "}
                <button type="button" onClick={calendar.reload} className="underline">
                  Try again
                </button>
              </p>
            ) : (
              <div
                role="grid"
                aria-label={`${monthLabel(month)} availability`}
                aria-busy={calendar.loading}
                className={cx(
                  "mt-[16px] grid grid-cols-7 gap-[4px] text-center",
                  calendar.loading && "opacity-50",
                )}
              >
                {WEEKDAYS.map((d, i) => (
                  <span key={i} className="pb-[8px] text-[9px]" style={{ color: MUTED }}>
                    {d}
                  </span>
                ))}
                {Array.from({ length: firstWeekday }, (_, i) => (
                  <span key={`gap-${i}`} />
                ))}
                {days.map((d) => {
                  const past = d < today;
                  const isSelected = d === day;
                  const off = unavailable.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${shortDate(d)}${d === today ? ", today" : ""}${blockedDays.has(d) ? ", blocked" : off ? ", unavailable" : ""}`}
                      onClick={() => pickDay(d)}
                      className={cx(
                        "flex h-[34px] items-center justify-center text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0d1b2a] lg:h-[44px] lg:text-[13px]",
                        !isSelected && !off && "hover:bg-[#f2f1ee]",
                        past && !isSelected && "text-[#9a9da1]",
                        d === today &&
                          !isSelected &&
                          "outline outline-1 -outline-offset-1 outline-[#c9c6c0]",
                      )}
                      style={
                        isSelected
                          ? { backgroundColor: NAVY, color: "white" }
                          : off
                            ? { backgroundColor: SAND }
                            : undefined
                      }
                    >
                      {Number(d.slice(8))}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="mt-[14px] text-[10px] leading-[16px]" style={{ color: BODY }}>
              {Number(day.slice(8))} selected ·{" "}
              {calendar.loading
                ? "Checking availability…"
                : !unavailable.length
                  ? "Every date has a free slot"
                  : unavailable.length > 10
                    ? `${unavailable.length} dates unavailable · Other dates available`
                    : `${unavailable.map((d) => Number(d.slice(8))).join(" / ")} unavailable · Other dates available`}
            </p>
            {yacht && !yacht.is_active && (
              <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
                This yacht is inactive, so customers can’t book it.
              </p>
            )}
            <InfoPanel title="Availability key" className="mt-[14px]">
              Confirmed bookings · Payment holds · Maintenance blocks. Existing bookings take
              precedence over new blocks.
            </InfoPanel>
          </div>

          <div className="mt-[24px] flex flex-wrap gap-[14px] lg:mt-[30px]">
            <Link
              href={adminRoutes.availabilityBlockNew(yachtId, day >= today ? day : "")}
              className={cx(smallPrimary, "min-w-[118px]")}
              style={PRIMARY_STYLE}
            >
              Block a time
            </Link>
            <Link
              href={adminRoutes.blockBatchNew}
              className={cx(smallOutline, "min-w-[118px]")}
              style={OUTLINE_STYLE}
            >
              Block several yachts
            </Link>
            <Link
              href={adminRoutes.bookings}
              className={cx(smallOutline, "min-w-[118px]")}
              style={OUTLINE_STYLE}
            >
              View bookings
            </Link>
            <Link
              href={adminRoutes.availabilityBlocked}
              className={cx(smallOutline, "min-w-[118px]")}
              style={OUTLINE_STYLE}
            >
              All blocks
            </Link>
          </div>

          {yacht && !calendar.loading && <Schedule entries={entries} selected={day} />}
        </>
      )}
    </div>
  );
}

function Schedule({ entries, selected }: { entries: Entry[]; selected: string }) {
  if (!entries.length) {
    return (
      <p className="mt-[24px] text-[12px] lg:max-w-[880px]" style={{ color: BODY }}>
        Nothing booked or blocked this month, and no free slots on {shortDate(selected)}. A yacht
        needs charter hours and priced packages before slots appear.
      </p>
    );
  }
  return (
    <>
      {/* Desktop table */}
      <table className="mt-[24px] hidden w-full border-collapse text-left text-[11px] lg:table lg:max-w-[880px]">
        <caption className="sr-only">Bookings, holds and blocks this month</caption>
        <thead>
          <tr style={{ backgroundColor: SAND }}>
            {["Date", "Time", "Availability"].map((h) => (
              <th
                key={h}
                scope="col"
                className="px-[12px] py-[10px] font-normal"
                style={{ color: BODY }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {entries.map((e) => (
            <tr key={e.key} className="border-b border-[#ebe9e4]">
              <td className={cx("px-[12px] py-[11px]", e.date === selected && "font-medium")}>
                {shortDate(e.date)}
              </td>
              <td className="px-[12px] py-[11px]">{e.time}</td>
              <td className="px-[12px] py-[11px]">
                {e.href ? (
                  <Link href={e.href} className="underline-offset-2 hover:underline">
                    {e.label}
                  </Link>
                ) : (
                  e.label
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone cards */}
      <ul className="mt-[24px] grid gap-[14px] lg:hidden">
        {entries.map((e) => (
          <li key={e.key} className="border border-[#dcdad5] bg-white px-[16px] py-[18px]">
            <p className="text-[18px] leading-[24px]">{shortDate(e.date)}</p>
            <p className="mt-[12px] text-[10px]" style={{ color: BODY }}>
              Time
            </p>
            <p className="text-[12px]">{e.time}</p>
            <p className="mt-[10px] text-[10px]" style={{ color: BODY }}>
              Availability
            </p>
            <p className="text-[12px]">{e.label}</p>
            {e.href && (
              <Link
                href={e.href}
                className={cx(smallOutline, "mt-[14px] h-[36px] w-fit")}
                style={OUTLINE_STYLE}
              >
                {e.action ?? "View details"} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
