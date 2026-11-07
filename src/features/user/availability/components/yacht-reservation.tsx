"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { INK, SANS, SERIF } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import {
  BODY,
  BORDER,
  Loading,
  MUTED,
  Notice,
  QuantityStepper,
  SectionTitle,
  SummaryRows,
  textLinkClass,
} from "@/features/user/checkout/components/checkout-ui";
import { quotePriceRows } from "@/features/user/checkout/components/price-summary";
import { useQuote } from "@/features/user/checkout/components/quote-summary";
import { checkoutErrorMessage } from "@/features/user/checkout/utils/checkout-error-message";
import { startCheckout } from "@/features/user/checkout/utils/checkout-store";
import {
  addMinutesToLocalTime,
  formatClockTime,
  formatDay,
  formatDuration,
  formatMinorUnits,
  formatMonth,
  formatShortDay,
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
  type YachtCalendar,
  type YachtSlot,
  type YachtSlotType,
} from "@/services/user/yachts.service";

const CARD = "#041427"; // booking card
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const DAY_LABELS: Record<DayStatus, string> = {
  available: "Available",
  partly_available: "Partly available",
  unavailable: "Unavailable",
  past: "Past",
};

const selectable = (status: DayStatus) => status === "available" || status === "partly_available";

/** A null price means the slot cannot be booked, whatever its state says. */
const isOpen = (slot: YachtSlot) => slot.state === "available" && slot.price !== null;

const timeInputClass =
  "mt-[8px] h-[52px] w-full max-w-[240px] cursor-pointer border bg-white px-[12px] text-[15px] outline-none focus:border-[#0d1b2a]";

function errorText(error: unknown, fallback: string): string {
  const { code } = getBackendErrorDetails(error);
  if (code === "INVALID_SLOT_TYPE") return "That charter length isn’t offered on this yacht.";
  if (code === "GUESTS_EXCEED_CAPACITY") return "That’s more guests than this yacht can take.";
  if (code === "YACHT_NOT_FOUND" || (isApiError(error) && error.status === 404)) {
    return "This yacht is no longer available.";
  }
  return fallback;
}

/** One month of the calendar. Only what the API offers can be chosen. */
function MonthGrid({
  month,
  calendar,
  date,
  onPick,
  className,
}: {
  month: string;
  calendar: { data: YachtCalendar | undefined; loading: boolean };
  date: string | null;
  onPick: (date: string) => void;
  className?: string;
}) {
  const days = calendar.data?.month === month ? calendar.data.days : [];
  // Weeks start on Monday; `leadingBlankDays` counts from Sunday.
  const blanks = (leadingBlankDays(days[0]?.date ?? `${month}-01`) + 6) % 7;

  return (
    <div className={cx("min-w-0", className)}>
      <h3 className="text-center text-[20px] leading-[28px]">{formatMonth(month)}</h3>
      {calendar.loading && days.length === 0 ? (
        <Loading label="Loading the calendar" />
      ) : days.length === 0 ? (
        <Notice>No dates are published for this month.</Notice>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="mt-[16px] grid grid-cols-7 text-center text-[11px] tracking-[0.12em] uppercase"
            style={{ color: MUTED }}
          >
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <ul className="mt-[8px] grid grid-cols-7">
            {Array.from({ length: blanks }).map((_, index) => (
              <li key={`blank-${index}`} aria-hidden="true" />
            ))}
            {days.map((day) => {
              const open = selectable(day.status);
              const selected = day.date === date;
              return (
                <li key={day.date} className="flex h-[48px] items-center justify-center">
                  <button
                    type="button"
                    disabled={!open}
                    aria-pressed={selected}
                    aria-label={`${formatDay(day.date)}: ${DAY_LABELS[day.status]}`}
                    onClick={() => onPick(day.date)}
                    className={cx(
                      "flex size-[40px] items-center justify-center rounded-full text-[15px] transition-colors",
                      selected && "bg-[#0d1b2a] text-white",
                      !selected && open && "hover:bg-[#eef3f9]",
                      !selected &&
                        day.status === "partly_available" &&
                        "border border-dashed border-[#7a7f85]",
                      day.status === "unavailable" &&
                        "cursor-not-allowed text-[#9aa0a6] line-through",
                      day.status === "past" && "cursor-not-allowed text-[#c4c7cb]",
                    )}
                  >
                    {Number(day.date.slice(8))}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Steps() {
  const steps = ["Dates", "Review", "Confirmed"];
  return (
    <ol aria-label="Booking steps" className="flex flex-wrap items-center gap-x-[24px] gap-y-2">
      {steps.map((step, index) => (
        <li
          key={step}
          aria-current={index === 0 ? "step" : undefined}
          className="flex items-center gap-[10px] text-[14px]"
          style={{ color: index === 0 ? INK : MUTED }}
        >
          <span
            className={cx(
              "flex size-[28px] items-center justify-center rounded-full border text-[12px]",
              index === 0 ? "border-[#0d1b2a] bg-[#0d1b2a] text-white" : "border-[#c9ccd0]",
            )}
          >
            {index + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}

function DateBox({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 px-[16px] py-[14px]">
      <p className="text-[11px] leading-[16px] tracking-[0.12em] text-white/60 uppercase">
        {label}
      </p>
      <p className="mt-[4px] text-[16px] leading-[22px]">{value}</p>
      {detail && <p className="text-[13px] leading-[18px] text-white/60">{detail}</p>}
    </div>
  );
}

export interface YachtReservationProps {
  yachtId: string;
  slug: string;
  name: string;
  capacity: number;
  suites: number | null;
  slotTypes: YachtSlotType[];
  enquiryEnabled: boolean;
  /** An enquiry-only yacht cannot be booked here, so its charters are not selectable. */
  bookingMode: "instant" | "enquiry_only";
  /** Formatted, excluding GST; null when the backend has no starting price. */
  startingPrice: string | null;
  departureCity: string | null;
  /** YYYY-MM. */
  initialMonth: string;
  /** Left-column content above the calendar. */
  intro?: ReactNode;
  /** Left-column content below the calendar. */
  after?: ReactNode;
}

/**
 * Calendar, charters, add-ons and the navy booking card for one yacht.
 * Everything shown comes from the API: this never decides availability or works
 * out a price itself, and it books nothing. It hands the selection (identifiers
 * and quantities) to checkout. A booking is one date and one charter, so the
 * card's disembarkation comes from the chosen charter, not from a second date.
 */
export function YachtReservation({
  yachtId,
  slug,
  name,
  capacity,
  suites,
  slotTypes,
  enquiryEnabled,
  bookingMode,
  startingPrice,
  departureCity,
  initialMonth,
  intro,
  after,
}: YachtReservationProps) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [slotTypeId, setSlotTypeId] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [guests, setGuests] = useState(0);
  /** HH:mm, as the customer entered it. The backend decides whether it can be booked. */
  const [startTime, setStartTime] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const bookable = bookingMode === "instant";

  const slotTypeParam = slotTypeId ? { slot_type_id: slotTypeId } : {};
  const nextMonth = shiftMonth(month, 1);

  const calendar = useApiQuery(
    (signal) => getYachtCalendar(slug, { month, ...slotTypeParam }, signal),
    `${slug}|${month}|${slotTypeId}`,
  );
  const followingCalendar = useApiQuery(
    (signal) => getYachtCalendar(slug, { month: nextMonth, ...slotTypeParam }, signal),
    `${slug}|${nextMonth}|${slotTypeId}`,
  );
  const slots = useApiQuery(
    (signal) =>
      date
        ? getYachtSlots(slug, { date, ...(guests ? { guests } : {}) }, signal)
        : Promise.resolve(null),
    `${slug}|${date}|${guests}`,
  );
  const addons = useApiQuery((signal) => getYachtAddons(slug, signal), slug);

  const showDate = (next: string | null) => setDate(next);
  const showMonth = (next: string) => {
    setMonth(next);
    const shown = [next, shiftMonth(next, 1)];
    if (date && !shown.includes(date.slice(0, 7))) showDate(null);
  };
  const addonItems = addons.data?.items ?? [];
  const calendarError = calendar.error ?? followingCalendar.error;
  const slotTypeInvalid = getBackendErrorDetails(calendarError).code === "INVALID_SLOT_TYPE";
  const timezone = calendar.data?.timezone;

  const slotData = slots.data?.date === date ? slots.data : null;
  // The backend's slots for this date, grouped by slot type. Only bookable ones are offered.
  const openSlots = slotData?.slots.filter(isOpen) ?? [];
  const packages = [
    ...new Map(
      openSlots.map((slot) => [
        slot.slot_type_id,
        { id: slot.slot_type_id, name: slot.slot_type_name },
      ]),
    ).values(),
  ];
  const durationLabel = ({ id, name }: { id: string; name: string }) => {
    const minutes = slotTypes.find((type) => type.id === id)?.duration_minutes;
    return minutes === undefined ? name : formatDuration(minutes);
  };
  const slotsOf = (id: string) => openSlots.filter((slot) => slot.slot_type_id === id);
  const fromPrice = (id: string) =>
    formatMinorUnits(
      Math.min(...slotsOf(id).map((slot) => slot.price ?? Infinity)),
      slotData?.currency ?? "INR",
    );
  const packageSlots = slotsOf(slotTypeId);
  const packageTimes = packageSlots.map((slot) => slot.start_time).sort();
  const earliest = packageTimes[0];
  const latest = packageTimes.at(-1);
  const packageTerms = packageSlots[0];
  // The package's length comes from the API: the yacht's slot types, else its first slot.
  const packageMinutes =
    slotTypes.find((type) => type.id === slotTypeId)?.duration_minutes ??
    (packageTerms &&
      (Date.parse(packageTerms.ends_at) - Date.parse(packageTerms.starts_at)) / 60_000);
  // Display only, so it follows the package and time at once. It is never sent to the API.
  const disembark =
    date && startTime && packageMinutes
      ? addMinutesToLocalTime(date, startTime, packageMinutes)
      : null;

  // A new answer for this date drops a package it no longer offers. The chosen time is not
  // compared with the list: every change of date, package or time is checked by the quote.
  if (slotData && !slots.loading && slotTypeId && packageSlots.length === 0) {
    setSlotTypeId("");
    setStartTime("");
  }
  const selectedAddons = addonItems
    .filter((addon) => (quantities[addon.id] ?? 0) > 0)
    .map((addon) => ({ addon_id: addon.id, quantity: quantities[addon.id] ?? 0 }));
  const selection =
    bookable && slotTypeId && startTime && date && guests > 0
      ? {
          slot_type_id: slotTypeId,
          date,
          start_time: startTime,
          guests,
          addons: selectedAddons,
        }
      : null;
  const quote = useQuote(selection && { ...selection, yacht_id: yachtId });
  /** The backend's own start and end, once it has accepted this selection. */
  const quoted = selection && !quote.loading && !quote.error ? quote.data : null;
  const quoteError = !selection || quote.loading ? null : quote.error;
  const timeRefused = getBackendErrorDetails(quoteError).code === "SLOT_NOT_AVAILABLE";
  const quoteErrorText = timeRefused
    ? "That start time isn’t available for this package. Please choose another time."
    : checkoutErrorMessage(quoteError, "We couldn’t work out the price just now.");

  const reserve = () => {
    if (!selection) return;
    startCheckout({ ...selection, yacht: { id: yachtId, slug, name } });
    router.push(userRoutes.checkout);
  };

  const instruction = !date
    ? "Pick your embarkation day on the calendar to see your total."
    : !slotTypeId
      ? "Choose a charter package to see your total."
      : !startTime
        ? "Choose your start time to see your total."
        : guests === 0
          ? "Add your guests to see your total."
          : null;

  const reservation = (
    <section
      id="reserve"
      aria-labelledby="reserve-heading"
      className={cx(
        "min-w-0 scroll-mt-[24px] xl:col-start-1 xl:row-start-2",
        intro && "xl:mt-[64px] xl:border-t xl:border-[#e5e7eb] xl:pt-[64px]",
      )}
    >
      <p className="text-[12px] leading-[16px] tracking-[0.18em] uppercase">Reserve {name}</p>
      <div className="mt-[16px] flex flex-wrap items-end justify-between gap-[20px]">
        <h2
          id="reserve-heading"
          className="text-[40px] leading-[44px] tracking-[-1.5px] lg:text-[56px] lg:leading-[58px]"
        >
          Choose your dates.
        </h2>
        <Steps />
      </div>

      <div className="mt-[24px] border border-[#e5e7eb] p-[20px] lg:p-[32px]">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            aria-label="Previous month"
            disabled={month <= initialMonth}
            onClick={() => showMonth(shiftMonth(month, -1))}
            className="flex size-[44px] shrink-0 items-center justify-center border border-[#c9ccd0] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" strokeWidth={1.5} className="size-4" />
          </button>
          <p className="min-w-0 text-center text-[13px] leading-[18px]" style={{ color: BODY }}>
            {startingPrice && `Rates from ${startingPrice} · excl. GST`}
            {startingPrice && departureCity && " · "}
            {departureCity && <span className="capitalize">{departureCity} departures</span>}
          </p>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => showMonth(nextMonth)}
            className="flex size-[44px] shrink-0 items-center justify-center border border-[#c9ccd0]"
          >
            <ChevronRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
          </button>
        </div>

        {calendarError ? (
          <Notice alert>
            {errorText(calendarError, "We couldn’t load the calendar just now.")}{" "}
            <button
              type="button"
              className={textLinkClass}
              onClick={
                slotTypeInvalid
                  ? () => setSlotTypeId("")
                  : () => {
                      calendar.reload();
                      followingCalendar.reload();
                    }
              }
            >
              {slotTypeInvalid ? "Show any length" : "Try again"}
            </button>
          </Notice>
        ) : (
          <div className="mt-[24px] grid gap-x-[48px] md:grid-cols-2">
            <MonthGrid month={month} calendar={calendar} date={date} onPick={showDate} />
            {/* One month at a time on a phone; the arrows move through them. */}
            <MonthGrid
              month={nextMonth}
              calendar={followingCalendar}
              date={date}
              onPick={showDate}
              className="hidden md:block"
            />
          </div>
        )}

        <div
          className="mt-[24px] flex flex-wrap items-center justify-between gap-x-[24px] gap-y-3 border-t border-[#e5e7eb] pt-[20px] text-[13px]"
          style={{ color: BODY }}
        >
          <div className="flex flex-wrap items-center gap-x-[20px] gap-y-2">
            <span className="flex items-center gap-[8px]">
              <span aria-hidden="true" className="size-[14px] rounded-full bg-[#0d1b2a]" />
              Your date
            </span>
            <span className="flex items-center gap-[8px]">
              <span
                aria-hidden="true"
                className="size-[14px] rounded-full border border-dashed border-[#7a7f85]"
              />
              Partly available
            </span>
            <span className="flex items-center gap-[8px]">
              <span aria-hidden="true" className="text-[#9aa0a6] line-through">
                14
              </span>
              Not available
            </span>
          </div>
          {date && (
            <button
              type="button"
              onClick={() => showDate(null)}
              className="border-b border-[#0d1b2a] text-[12px] tracking-[0.12em] uppercase"
              style={{ color: INK }}
            >
              Clear dates
            </button>
          )}
        </div>

        <div className="mt-[24px]">
          {timezone && (
            <p className="text-[13px] leading-[18px]" style={{ color: MUTED }}>
              Dates and times are shown as the marina keeps them ({timezone}).
            </p>
          )}
          {!date ? (
            <p className="mt-[12px] text-[16px] leading-[24px]">Select your embarkation day.</p>
          ) : (
            <>
              <h3 className="mt-[12px] text-[20px] leading-[28px]">{formatDay(date)}</h3>
              {slots.loading ? (
                <Loading label="Loading charters" />
              ) : slots.error ? (
                <Notice alert>
                  {errorText(slots.error, "We couldn’t load the charters for this date.")}{" "}
                  <button type="button" className={textLinkClass} onClick={slots.reload}>
                    Try again
                  </button>
                </Notice>
              ) : !slotData?.slots.length ? (
                <Notice>No charters are listed for this date.</Notice>
              ) : packages.length === 0 ? (
                <Notice>No charters are available on this date.</Notice>
              ) : (
                <>
                  <div role="group" aria-label="Charter package" className="mt-[16px]">
                    <p className="text-[12px] leading-[16px]" style={{ color: BODY }}>
                      Charter package
                    </p>
                    <div className="mt-[10px] grid gap-[10px] sm:grid-cols-3">
                      {packages.map((option) => {
                        const selected = option.id === slotTypeId;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            disabled={!bookable}
                            onClick={() => setSlotTypeId(option.id)}
                            className={cx(
                              "min-w-0 border px-[16px] py-[14px] text-left transition-colors disabled:cursor-not-allowed",
                              selected
                                ? "border-[#0d1b2a] bg-[#0d1b2a] text-white"
                                : "bg-white enabled:hover:border-[#0d1b2a]",
                            )}
                            style={selected ? undefined : { borderColor: BORDER, color: INK }}
                          >
                            <span className="block text-[18px] leading-[24px]">
                              {durationLabel(option)}
                            </span>
                            <span
                              className={cx(
                                "mt-[2px] block text-[13px] leading-[18px]",
                                selected ? "text-white/75" : "text-[#7a7f85]",
                              )}
                            >
                              From {fromPrice(option.id)} · excl. GST
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {slotTypeId && bookable && (
                    <div className="mt-[20px]">
                      <label
                        htmlFor="charter-start"
                        className="block text-[12px]"
                        style={{ color: BODY }}
                      >
                        Start time
                      </label>
                      <input
                        id="charter-start"
                        type="time"
                        value={startTime}
                        min={earliest}
                        max={latest}
                        aria-invalid={Boolean(quoteError)}
                        aria-describedby="charter-start-hint"
                        onChange={(event) => setStartTime(event.currentTarget.value)}
                        className={timeInputClass}
                        style={{ borderColor: BORDER }}
                      />
                      <p
                        id="charter-start-hint"
                        className="mt-[8px] text-[13px] leading-[18px]"
                        style={{ color: quoteError ? "#b42318" : MUTED }}
                      >
                        {quoteError
                          ? quoteErrorText
                          : earliest &&
                            latest &&
                            `Earliest start ${formatClockTime(earliest)}, latest ${formatClockTime(latest)}.`}
                      </p>
                    </div>
                  )}

                  {packageTerms && packageTerms.included_guests !== null && (
                    <p className="mt-[16px] text-[14px] leading-[20px]" style={{ color: MUTED }}>
                      Includes {packageTerms.included_guests}{" "}
                      {packageTerms.included_guests === 1 ? "guest" : "guests"}
                      {packageTerms.extra_guest_amount !== null &&
                        ` · ${formatMinorUnits(packageTerms.extra_guest_amount, slotData.currency)} per extra guest`}
                    </p>
                  )}

                  {quoted && (
                    <p className="mt-[16px] border-t border-[#e5e7eb] pt-[16px] text-[16px] leading-[24px]">
                      {formatClockTime(quoted.slot.start_time)} –{" "}
                      {formatClockTime(quoted.slot.end_time)}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {(addons.loading || addons.error || addonItems.length > 0) && (
        <div className="mt-[56px]">
          <SectionTitle>Add to your charter.</SectionTitle>
          {addons.loading ? (
            <Loading label="Loading add-ons" />
          ) : addons.error ? (
            <Notice alert>
              {errorText(addons.error, "We couldn’t load the add-ons just now.")}{" "}
              <button type="button" className={textLinkClass} onClick={addons.reload}>
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
                  {bookable && (
                    <div className="mt-[12px]">
                      <QuantityStepper
                        label={addon.name}
                        value={quantities[addon.id] ?? 0}
                        min={addon.min_quantity}
                        max={addon.max_quantity}
                        optional
                        onChange={(quantity) =>
                          setQuantities((current) => ({ ...current, [addon.id]: quantity }))
                        }
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );

  const card = (
    <div className="min-w-0 xl:col-start-2 xl:row-span-3 xl:row-start-1">
      <aside
        aria-label={`Your private charter on ${name}`}
        className="px-[24px] py-[32px] text-white sm:px-[33px] xl:sticky xl:top-[24px]"
        style={{ backgroundColor: CARD }}
      >
        <p className="text-[12px] leading-[16px] tracking-[0.18em] text-white/75 uppercase">
          Your private charter
        </p>
        <h3
          className="mt-[18px] max-w-[300px] text-[36px] leading-[42px] tracking-[-0.5px]"
          style={SANS}
        >
          Make {name} your own.
        </h3>
        <div className="mt-[24px] h-px bg-white/15" />

        {startingPrice ? (
          <div className="mt-[22px] flex flex-wrap items-baseline gap-x-[10px]">
            <p className="text-[40px] leading-[48px] tracking-[-0.5px]" style={SANS}>
              {startingPrice}
            </p>
            <p className="text-[14px] leading-[20px] text-white/70">Starting from · excl. GST</p>
          </div>
        ) : (
          <p className="mt-[22px] text-[16px] leading-[22px]">Price on request</p>
        )}

        <div className="mt-[20px] grid grid-cols-2 divide-x divide-white/25 border border-white/25">
          <DateBox
            label="Embark"
            value={date ? formatShortDay(date) : "Add date"}
            detail={startTime ? formatClockTime(startTime) : undefined}
          />
          <DateBox
            label="Disembark"
            value={disembark ? formatShortDay(disembark.date) : "Add date"}
            detail={disembark ? formatClockTime(disembark.time) : undefined}
          />
        </div>

        <div className="mt-[20px] flex items-center justify-between gap-[16px]">
          <div className="min-w-0">
            <p className="text-[11px] leading-[16px] tracking-[0.12em] text-white/60 uppercase">
              Guests
            </p>
            <p className="text-[14px] leading-[20px] text-white/80">
              Up to {capacity}
              {suites !== null && ` · ${suites} ${suites === 1 ? "suite" : "suites"}`}
            </p>
          </div>
          <QuantityStepper
            label="guests"
            value={guests}
            min={0}
            max={capacity}
            onChange={setGuests}
            dark
          />
        </div>
        <div className="mt-[20px] h-px bg-white/15" />

        {!bookable ? (
          <p className="mt-[20px] text-[15px] leading-[24px] text-white/85">
            {name} is arranged by enquiry, so it can’t be reserved online.
          </p>
        ) : (
          <>
            {instruction ? (
              <p className="mt-[20px] text-[15px] leading-[24px] text-white/85">{instruction}</p>
            ) : quote.loading ? (
              <div className="mt-[20px]">
                <Spinner label="Calculating your price" />
              </div>
            ) : quoteError ? (
              <p role="alert" className="mt-[20px] text-[15px] leading-[24px] text-white/85">
                {quoteErrorText}{" "}
                {!timeRefused && (
                  <button type="button" className={textLinkClass} onClick={quote.reload}>
                    Try again
                  </button>
                )}
              </p>
            ) : (
              quoted && <SummaryRows rows={quotePriceRows(quoted)} dark />
            )}

            <button
              type="button"
              disabled={!quoted}
              onClick={reserve}
              className="mt-[24px] flex h-[56px] w-full items-center justify-between bg-white px-[20px] text-[12px] tracking-[0.18em] uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50"
              style={{ color: quoted ? INK : undefined }}
            >
              Reserve these dates
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
            </button>
            <p className="mt-[16px] text-[13px] leading-[20px] text-white/70">
              No payment yet. Next, review your charter on a single page.
            </p>
          </>
        )}

        {enquiryEnabled && (
          <>
            <div className="mt-[24px] h-px bg-white/15" />
            <p className="mt-[24px] text-[28px] leading-[34px] italic" style={SERIF}>
              Planning something bespoke?
            </p>
            <p className="mt-[10px] text-[14px] leading-[22px] text-white/75">
              Longer voyages, weddings, corporate charters or more than one yacht — our concierge
              will build a proposal around you.
            </p>
            <Link
              href={userRoutes.planCharterFor(slug)}
              className="mt-[20px] flex h-[50px] items-center justify-between border border-white/40 px-[16px] text-[12px] tracking-[0.18em] uppercase transition-colors hover:bg-white/10"
            >
              Request a custom quote
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
            </Link>
          </>
        )}
      </aside>
    </div>
  );

  return (
    <div className="grid gap-y-[64px] xl:grid-cols-[minmax(0,1fr)_447px] xl:gap-x-[80px] xl:gap-y-0">
      {intro && <div className="min-w-0 xl:col-start-1 xl:row-start-1">{intro}</div>}
      {reservation}
      {card}
      {after && <div className="min-w-0 xl:col-start-1 xl:row-start-3 xl:mt-[64px]">{after}</div>}
    </div>
  );
}
