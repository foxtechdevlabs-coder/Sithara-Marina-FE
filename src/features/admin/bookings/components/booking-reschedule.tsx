"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BODY, INK, MUTED, NAVY, SAND } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import {
  getBooking,
  getYachtCalendar,
  quoteOfficeBooking,
  rescheduleBooking,
  type BookingDetail,
} from "@/services/admin/bookings.service";

import {
  bookingErrorMessage,
  bookingStatusLabel,
  durationText,
  formatRupees,
  longDate,
  marinaToday,
  monthLabel,
  monthRange,
  shiftMonth,
  shortDate,
  slotText,
} from "../utils/booking-format";
import {
  Card,
  formGrid,
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "./booking-ui";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Reschedule: "A new time on the water." (admin Figma A12). The month shows
 * which days still have a free slot (GET /admin/calendar); the price is
 * rechecked with POST /pricing/quote, since the backend refuses a move that
 * changes it. Saves with POST /admin/bookings/{id}/reschedule.
 */
export function BookingReschedule({ bookingId }: { bookingId: string }) {
  const booking = useAdminQuery((signal) => getBooking(bookingId, signal), `booking:${bookingId}`);

  if (!booking.data) {
    return (
      <div className={pagePadding}>
        <LoadState
          loading={booking.loading}
          error={
            booking.error
              ? `Couldn't load the booking. ${bookingErrorMessage(booking.error)}`
              : undefined
          }
          onRetry={booking.reload}
          label="Loading booking"
        />
      </div>
    );
  }
  const b = booking.data;
  if (b.status !== "pending_payment" && b.status !== "confirmed") {
    return (
      <div className={pagePadding}>
        <PageHeader title="A new time on the water." />
        <p className="mt-[24px] text-[14px]" style={{ color: BODY }}>
          This booking is {bookingStatusLabel(b.status).toLowerCase()}, so it can’t be rescheduled.
        </p>
        <Link
          href={adminRoutes.booking(b.id)}
          className={cx(smallOutline, "mt-[18px] w-fit")}
          style={OUTLINE_STYLE}
        >
          Back to booking
        </Link>
      </div>
    );
  }
  return <RescheduleForm booking={b} />;
}

function RescheduleForm({ booking: b }: { booking: BookingDetail }) {
  const router = useRouter();
  const today = marinaToday();
  const [month, setMonth] = useState(
    b.date.slice(0, 7) < today.slice(0, 7) ? today.slice(0, 7) : b.date.slice(0, 7),
  );
  const [date, setDate] = useState("");
  const [slotKey, setSlotKey] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);

  const range = monthRange(month);
  const calendar = useAdminQuery(
    (signal) => getYachtCalendar(b.yacht.id, range.from, range.to, signal),
    `resched:${b.yacht.id}:${month}`,
  );
  const windows = calendar.data?.free_windows ?? [];
  const dayWindows = windows.filter((w) => w.date === date);
  // The booking's own package first.
  const sorted = [...dayWindows].sort(
    (x, y) =>
      Number(y.slot_type_name === b.slot_type_name) -
        Number(x.slot_type_name === b.slot_type_name) || x.start_time.localeCompare(y.start_time),
  );
  const slot = dayWindows.find((w) => `${w.slot_type_id}@${w.start_time}` === slotKey);

  const addons = b.pricing.addons.map((a) => ({ addon_id: a.addon_id, quantity: a.quantity }));
  const quote = useAdminQuery(
    (signal) =>
      slot
        ? quoteOfficeBooking(
            {
              yacht_id: b.yacht.id,
              slot_type_id: slot.slot_type_id,
              date: slot.date,
              start_time: slot.start_time,
              guests: b.guest_count,
              ...(addons.length ? { addons } : {}),
            },
            signal,
          )
        : Promise.resolve(null),
    `resched-quote:${slotKey}:${date}`,
  );
  const difference = quote.data ? quote.data.total_amount - b.total_amount : 0;

  // Days of the month, Monday first.
  const daysInMonth = Number(range.to.slice(8));
  const firstWeekday = (new Date(`${range.from}T00:00:00Z`).getUTCDay() + 6) % 7;
  const freeDays = new Set(windows.map((w) => w.date));
  const days = Array.from(
    { length: daysInMonth },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
  const unavailable = days.filter((d) => d >= today && !freeDays.has(d));

  function pickDate(value: string) {
    setDate(value);
    setSlotKey("");
    if (value && value.slice(0, 7) !== month) setMonth(value.slice(0, 7));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!date) next.date = "Choose the new departure date.";
    if (!slot) next.slot = "Choose a free slot.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setFailure("");
    try {
      await rescheduleBooking(b.id, {
        slot_type_id: slot!.slot_type_id,
        date: slot!.date,
        start_time: slot!.start_time,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      router.push(adminRoutes.booking(b.id));
    } catch (err) {
      setFailure(bookingErrorMessage(err));
      calendar.reload();
      setBusy(false);
    }
  }

  return (
    <div className={pagePadding}>
      <PageHeader
        title="A new time on the water."
        subtitle={`Reschedule ${b.reference} without losing the original booking record.`}
      />

      <form onSubmit={save} noValidate>
        <Card title="Current departure" className="mt-[24px] lg:mt-[30px] lg:max-w-[880px]">
          {b.yacht.name} · {longDate(b.date).replace(/ \d{4}$/, "")} · {slotText(b)} ·{" "}
          {b.guest_count} {b.guest_count === 1 ? "guest" : "guests"}
        </Card>

        <div className={cx(formGrid, "mt-[24px] lg:mt-[30px]")}>
          <div>
            <Label htmlFor="new-date" required>
              New departure
            </Label>
            <input
              id="new-date"
              type="date"
              value={date}
              min={today}
              onChange={(e) => pickDate(e.currentTarget.value)}
              className={input}
              {...errorProps("new-date", errors.date)}
            />
            <FieldError id="new-date" message={errors.date} />
          </div>
          <div>
            <Label htmlFor="new-slot" required>
              New slot
            </Label>
            <SelectBox
              id="new-slot"
              value={slotKey}
              onChange={setSlotKey}
              disabled={!date || calendar.loading}
              invalid={errors.slot}
              options={[
                {
                  value: "",
                  label: !date
                    ? "Choose a date first"
                    : calendar.loading
                      ? "Checking free slots…"
                      : sorted.length
                        ? "Choose a slot"
                        : "No free slots on this date",
                },
                ...sorted.map((w) => ({
                  value: `${w.slot_type_id}@${w.start_time}`,
                  label: `${slotText(w)} · ${durationText(w.start_time, w.end_time) || w.slot_type_name}`,
                })),
              ]}
            />
            <FieldError id="new-slot" message={errors.slot} />
          </div>
        </div>

        {/* Month */}
        <div className="mt-[30px] border border-[#dcdad5] bg-white px-[14px] py-[20px] lg:max-w-[880px] lg:px-[18px] lg:py-[24px]">
          <div className="flex items-center justify-between gap-[10px]">
            <h2 className="text-[22px] leading-[28px] lg:text-[26px]">{monthLabel(month)}</h2>
            <div className="flex gap-[6px]">
              <button
                type="button"
                aria-label="Previous month"
                disabled={month <= today.slice(0, 7)}
                onClick={() => setMonth(shiftMonth(month, -1))}
                className="flex size-[34px] items-center justify-center border border-[#dcdad5] disabled:opacity-40"
              >
                <ChevronLeft aria-hidden="true" className="size-[14px]" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setMonth(shiftMonth(month, 1))}
                className="flex size-[34px] items-center justify-center border border-[#dcdad5]"
              >
                <ChevronRight aria-hidden="true" className="size-[14px]" />
              </button>
            </div>
          </div>
          <p className="mt-[8px] text-[9px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
            All charter times · {b.time_zone}
          </p>

          {calendar.error && !calendar.loading ? (
            <p role="alert" className="mt-[16px] text-[12px]">
              Couldn’t load availability. {bookingErrorMessage(calendar.error)}{" "}
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
                const selected = d === date;
                const current = d === b.date;
                const free = freeDays.has(d);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={past || !free || calendar.loading}
                    aria-pressed={selected}
                    aria-label={`${longDate(d)}${current ? ", current departure" : ""}${!past && !free ? ", unavailable" : ""}`}
                    onClick={() => pickDate(d)}
                    className={cx(
                      "flex h-[34px] items-center justify-center text-[12px] transition-colors lg:h-[44px] lg:text-[13px]",
                      past && "text-[#b9bbbe]",
                      !past && free && !selected && "hover:bg-[#f2f1ee]",
                      current &&
                        !selected &&
                        "outline outline-1 -outline-offset-1 outline-[#0d1b2a]",
                    )}
                    style={
                      selected
                        ? { backgroundColor: NAVY, color: "white" }
                        : !past && !free
                          ? { backgroundColor: SAND, color: "#8a8d91" }
                          : undefined
                    }
                  >
                    {Number(d.slice(8))}
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-[14px] text-[10px]" style={{ color: BODY }}>
            {date ? `${shortDate(date)} selected` : "No date selected"} ·{" "}
            {unavailable.length
              ? `${unavailable.map((d) => Number(d.slice(8))).join(" / ")} unavailable`
              : "Every remaining day has a free slot"}{" "}
            · Outlined: current departure
          </p>
          <InfoPanel title="Availability key" className="mt-[14px]">
            Confirmed bookings · Payment holds · Maintenance blocks. Existing bookings take
            precedence over new blocks.
          </InfoPanel>
        </div>

        <InfoPanel title="Price and availability review" className="mt-[24px] lg:max-w-[880px]">
          {!slot
            ? "Choose a new date and slot to check the price."
            : quote.loading
              ? "Checking the price…"
              : quote.error
                ? `Couldn't check the price here (${bookingErrorMessage(quote.error)}). The server checks it again when you confirm.`
                : quote.data &&
                  (difference === 0
                    ? `New total ${formatRupees(quote.data.total_amount)} · Difference ₹ 0. The new slot is free and the price is unchanged.`
                    : `New total ${formatRupees(quote.data.total_amount)} · Difference ${difference > 0 ? "+" : "−"} ${formatRupees(Math.abs(difference))}. A reschedule can't change the price, so this move will be refused. Cancel and rebook instead.`)}
        </InfoPanel>

        <div className="mt-[24px] lg:max-w-[580px]">
          <Label htmlFor="resched-reason">Reason (kept in the history)</Label>
          <input
            id="resched-reason"
            value={reason}
            maxLength={1000}
            onChange={(e) => setReason(e.currentTarget.value)}
            placeholder="e.g. Customer asked by phone"
            className={input}
          />
        </div>

        {failure && (
          <Notice tone="error" className="mt-[20px] lg:max-w-[880px]">
            {failure}
          </Notice>
        )}

        <div className="mt-[24px] flex flex-wrap gap-[14px]">
          <button type="submit" disabled={busy} className={smallPrimary} style={PRIMARY_STYLE}>
            {busy ? "Rescheduling…" : "Confirm reschedule"}
          </button>
          <Link
            href={adminRoutes.booking(b.id)}
            className={smallOutline}
            style={{ borderColor: INK }}
          >
            Back to booking
          </Link>
        </div>
      </form>
    </div>
  );
}
