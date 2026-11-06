"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { INK, SANS, SERIF } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import {
  formatDay,
  formatMinorUnits,
  formatMonth,
  formatTime,
  leadingBlankDays,
  shiftMonth,
} from "@/features/user/yachts/utils/yacht-view";
import { useApiQuery } from "@/hooks/use-api-query";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import {
  getYachtAddons,
  getYachtCalendar,
  getYachtSlots,
  type DayStatus,
  type YachtSlot,
  type YachtSlotType,
} from "@/services/user/yachts.service";

const BODY = "#4a4f55";
const MUTED = "#7a7f85";
const BORDER = "#c9ccd0";
const FRAME = "mx-auto w-full max-w-[1728px] px-5 lg:px-[100px]";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_LABELS: Record<DayStatus, string> = {
  available: "Available",
  partly_available: "Partly available",
  unavailable: "Unavailable",
  past: "Past",
};

const SLOT_STATES: Record<YachtSlot["state"], string> = {
  available: "Available",
  booked: "Booked",
  held: "On hold",
  blocked: "Unavailable",
  past: "Past",
};

const selectable = (status: DayStatus) => status === "available" || status === "partly_available";

/** A null price means the slot cannot be booked, whatever its state says. */
const isOpen = (slot: YachtSlot) => slot.state === "available" && slot.price !== null;

function errorText(error: unknown, fallback: string): string {
  const { code } = getBackendErrorDetails(error);
  if (code === "INVALID_SLOT_TYPE") return "That charter length isn’t offered on this yacht.";
  if (code === "GUESTS_EXCEED_CAPACITY") return "That’s more guests than this yacht can take.";
  if (code === "YACHT_NOT_FOUND" || (isApiError(error) && error.status === 404)) {
    return "This yacht is no longer available.";
  }
  return fallback;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      className="text-[28px] leading-[40px] tracking-[-0.5px] lg:text-[32px]"
      style={{ ...SANS, color: INK }}
    >
      {children}
    </h2>
  );
}

function Notice({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
  return (
    <p
      role={alert ? "alert" : undefined}
      className="mt-[20px] max-w-[520px] text-[16px] leading-[27px]"
      style={{ color: BODY }}
    >
      {children}
    </p>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="text-brand-600 mt-[20px]">
      <Spinner label={label} />
    </div>
  );
}

const fieldClass =
  "h-[58px] w-full cursor-pointer border bg-white px-[16px] text-[16px] outline-none focus:border-[#0d1b2a]";

export interface YachtAvailabilityProps {
  slug: string;
  name: string;
  capacity: number;
  slotTypes: YachtSlotType[];
  enquiryEnabled: boolean;
  /** YYYY-MM. */
  initialMonth: string;
}

/**
 * Calendar, slots and add-ons for one yacht. Everything shown comes from the
 * API: this screen never decides availability itself, and it books nothing.
 */
export function YachtAvailability({
  slug,
  name,
  capacity,
  slotTypes,
  enquiryEnabled,
  initialMonth,
}: YachtAvailabilityProps) {
  const [month, setMonth] = useState(initialMonth);
  const [slotTypeId, setSlotTypeId] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [guests, setGuests] = useState(0);

  const slotTypeParam = slotTypeId ? { slot_type_id: slotTypeId } : {};

  const calendar = useApiQuery(
    (signal) => getYachtCalendar(slug, { month, ...slotTypeParam }, signal),
    `${slug}|${month}|${slotTypeId}`,
  );
  const slots = useApiQuery(
    (signal) =>
      date
        ? getYachtSlots(slug, { date, ...slotTypeParam, ...(guests ? { guests } : {}) }, signal)
        : Promise.resolve(null),
    `${slug}|${date}|${slotTypeId}|${guests}`,
  );
  const addons = useApiQuery((signal) => getYachtAddons(slug, signal), slug);

  const days = calendar.data?.month === month ? calendar.data.days : [];
  const showMonth = (next: string) => {
    setMonth(next);
    setDate(null);
  };
  const addonItems = addons.data?.items ?? [];
  const slotTypeInvalid = getBackendErrorDetails(calendar.error).code === "INVALID_SLOT_TYPE";

  return (
    <div className="bg-white pb-[120px] antialiased" style={{ ...SANS, color: INK }}>
      <section className={`${FRAME} pt-[37px]`}>
        <nav
          aria-label="Breadcrumb"
          className="text-[12px] leading-[16px]"
          style={{ color: MUTED }}
        >
          <ol className="flex flex-wrap items-center gap-[12px]">
            <li>
              <Link href={userRoutes.yachts} className="hover:underline">
                Our yachts
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#b5b8bc]">
              /
            </li>
            <li>
              <Link href={userRoutes.yacht(slug)} className="hover:underline">
                {name}
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#b5b8bc]">
              /
            </li>
            <li aria-current="page" style={{ color: INK }}>
              Availability
            </li>
          </ol>
        </nav>

        <h1 className="mt-[40px] text-[48px] leading-[1.1] font-normal tracking-[-1.5px] lg:text-[72px] lg:tracking-[-2.21px]">
          Check <span style={SERIF}>availability</span>
        </h1>
        <p className="mt-[20px] max-w-[560px] text-[16px] leading-[26px]" style={{ color: BODY }}>
          Choose a date to see the charters open on {name}. Dates and times are shown as the marina
          keeps them{calendar.data ? ` (${calendar.data.timezone})` : ""}.
        </p>

        <div className="mt-[40px] grid max-w-[1144px] gap-[24px] sm:grid-cols-2">
          {slotTypes.length > 0 && (
            <div className="min-w-0">
              <label htmlFor="slot-type" className="block text-[12px]" style={{ color: BODY }}>
                Charter length
              </label>
              <select
                id="slot-type"
                value={slotTypeId}
                onChange={(event) => setSlotTypeId(event.currentTarget.value)}
                className={cx(fieldClass, "mt-[12px]")}
                style={{ borderColor: BORDER }}
              >
                <option value="">Any length</option>
                {slotTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="min-w-0">
            <label htmlFor="guests" className="block text-[12px]" style={{ color: BODY }}>
              Number of guests
            </label>
            <select
              id="guests"
              value={guests}
              onChange={(event) => setGuests(Number(event.currentTarget.value))}
              className={cx(fieldClass, "mt-[12px]")}
              style={{ borderColor: BORDER }}
            >
              <option value={0}>Not sure yet</option>
              {Array.from({ length: capacity }, (_, i) => i + 1).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={`${FRAME} mt-[64px] grid gap-[64px] xl:grid-cols-2 xl:gap-[80px]`}>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <SectionTitle>{formatMonth(month)}</SectionTitle>
            <div className="flex gap-[8px]">
              <button
                type="button"
                aria-label="Previous month"
                disabled={month <= initialMonth}
                onClick={() => showMonth(shiftMonth(month, -1))}
                className="flex size-[44px] items-center justify-center border disabled:cursor-not-allowed disabled:opacity-40"
                style={{ borderColor: INK }}
              >
                <ArrowLeft aria-hidden="true" strokeWidth={1.5} className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => showMonth(shiftMonth(month, 1))}
                className="flex size-[44px] items-center justify-center border"
                style={{ borderColor: INK }}
              >
                <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
              </button>
            </div>
          </div>

          {calendar.loading && days.length === 0 ? (
            <Loading label="Loading the calendar" />
          ) : calendar.error ? (
            <Notice alert>
              {errorText(calendar.error, "We couldn’t load the calendar just now.")}{" "}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={slotTypeInvalid ? () => setSlotTypeId("") : calendar.reload}
              >
                {slotTypeInvalid ? "Show any length" : "Try again"}
              </button>
            </Notice>
          ) : days.length === 0 ? (
            <Notice>No dates are published for this month.</Notice>
          ) : (
            <>
              <div
                className="mt-[24px] grid grid-cols-7 gap-[4px] text-center text-[12px]"
                style={{ color: MUTED }}
                aria-hidden="true"
              >
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <ul className="mt-[8px] grid grid-cols-7 gap-[4px]">
                {Array.from({ length: leadingBlankDays(days[0]?.date ?? `${month}-01`) }).map(
                  (_, index) => (
                    <li key={`blank-${index}`} aria-hidden="true" />
                  ),
                )}
                {days.map((day) => {
                  const open = selectable(day.status);
                  const selected = day.date === date;
                  return (
                    <li key={day.date} className="min-w-0">
                      <button
                        type="button"
                        disabled={!open}
                        aria-pressed={selected}
                        aria-label={`${formatDay(day.date)}: ${DAY_LABELS[day.status]}`}
                        onClick={() => setDate(day.date)}
                        className={cx(
                          "flex aspect-square w-full items-center justify-center border text-[14px] transition-colors",
                          selected && "border-[#0d1b2a] bg-[#0d1b2a] text-white",
                          !selected && open && "border-[#0d1b2a] hover:bg-[#f6f8fb]",
                          !selected && day.status === "partly_available" && "border-dashed",
                          !open && "cursor-not-allowed border-transparent bg-[#f4f5f6] text-[#9aa0a6]",
                        )}
                      >
                        {Number(day.date.slice(8))}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-[16px] text-[12px]" style={{ color: MUTED }}>
                Solid border: available. Dashed border: partly available. Grey: not available.
              </p>
            </>
          )}
        </div>

        <div className="min-w-0">
          <SectionTitle>{date ? formatDay(date) : "Your charter"}</SectionTitle>

          {!date ? (
            <Notice>Choose an available date to see its charters.</Notice>
          ) : slots.loading ? (
            <Loading label="Loading charters" />
          ) : slots.error ? (
            <Notice alert>
              {errorText(slots.error, "We couldn’t load the charters for this date.")}{" "}
              <button type="button" className="underline underline-offset-2" onClick={slots.reload}>
                Try again
              </button>
            </Notice>
          ) : !slots.data?.slots.length ? (
            <Notice>No charters are listed for this date.</Notice>
          ) : (
            <ul className="mt-[20px] border-t border-[#e5e7eb]">
              {slots.data.slots.map((slot, index) => {
                const { timezone, currency } = slots.data as NonNullable<typeof slots.data>;
                const price = formatMinorUnits(slot.price, currency);
                const extra = formatMinorUnits(slot.extra_guest_amount, currency);
                return (
                  <li
                    key={`${slot.slot_type_id}-${slot.starts_at}-${index}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[#e5e7eb] py-[16px]"
                  >
                    <div className="min-w-0">
                      <p className="text-[16px] leading-[24px]">{slot.slot_type_name}</p>
                      <p className="text-[14px] leading-[20px]" style={{ color: BODY }}>
                        {formatTime(slot.starts_at, timezone)} – {formatTime(slot.ends_at, timezone)}
                      </p>
                      {slot.included_guests !== null && (
                        <p className="text-[14px] leading-[20px]" style={{ color: MUTED }}>
                          Includes {slot.included_guests}{" "}
                          {slot.included_guests === 1 ? "guest" : "guests"}
                          {extra ? ` · ${extra} per extra guest` : ""}
                        </p>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[16px] leading-[24px]">
                        {isOpen(slot)
                          ? `${price} · excl. GST`
                          : slot.state === "available"
                            ? "Unavailable" // no price: it cannot be booked, whatever its state
                            : SLOT_STATES[slot.state]}
                      </p>
                      <p className="text-[14px] leading-[20px]" style={{ color: MUTED }}>
                        {isOpen(slot) ? "Available" : "Not available to book"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {enquiryEnabled && (
            <Link
              href={userRoutes.planCharter}
              className="mt-[24px] inline-flex items-center gap-[18px] border-b pb-[7px] text-[12px] leading-[16px] tracking-[0.18em] uppercase"
              style={{ borderColor: INK }}
            >
              Enquire about {name}
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
            </Link>
          )}
        </div>
      </section>

      {(addons.loading || addons.error || addonItems.length > 0) && (
        <section className={`${FRAME} mt-[80px]`}>
          <SectionTitle>Add to your charter.</SectionTitle>
          {addons.loading ? (
            <Loading label="Loading add-ons" />
          ) : addons.error ? (
            <Notice alert>
              {errorText(addons.error, "We couldn’t load the add-ons just now.")}{" "}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={addons.reload}
              >
                Try again
              </button>
            </Notice>
          ) : (
            <ul className="mt-[20px] grid gap-x-[36px] gap-y-[24px] md:grid-cols-2">
              {addonItems.map((addon) => (
                <li key={addon.id} className="min-w-0 border-t border-[#e5e7eb] pt-[16px]">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6">
                    <p className="text-[16px] leading-[24px]">{addon.name}</p>
                    <p className="text-[16px] leading-[24px]">
                      {formatMinorUnits(addon.price, addons.data?.currency ?? "INR")} · excl. GST
                    </p>
                  </div>
                  {addon.description && (
                    <p className="mt-[4px] text-[16px] leading-[25px]" style={{ color: BODY }}>
                      {addon.description}
                    </p>
                  )}
                  <p className="mt-[4px] text-[14px] leading-[20px]" style={{ color: MUTED }}>
                    Quantity {addon.min_quantity} to {addon.max_quantity}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
