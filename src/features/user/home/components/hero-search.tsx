"use client";

import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock,
  MapPin,
  SlidersVertical,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode, type SubmitEvent } from "react";

import {
  DURATIONS,
  EMPTY_FILTERS,
  GUEST_COUNTS,
  REGIONS,
  filtersToQuery,
  type YachtFilters,
} from "@/components/user/yacht-search";
import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

// Quick links into the full filter page (it opens with the current selections).
const MORE_OPTIONS = ["Yacht type", "Price range", "Capacity", "Cabins", "Amenities"];

const fieldLabel =
  "flex items-center gap-1.5 text-[0.625rem] leading-none tracking-[0.16em] text-[#6b7280] uppercase";
const fieldValue =
  "block h-6 w-full cursor-pointer appearance-none bg-transparent p-0 pr-6 text-[0.9375rem] leading-6 font-medium text-[#0d1b2a] outline-none";

function Field({
  id,
  label,
  icon: Icon,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "relative flex min-w-0 flex-col justify-start gap-1.5 px-4 py-3.5 lg:py-4 focus-within:bg-[#f6f8fb] lg:px-6",
        className,
      )}
    >
      <label htmlFor={id} className={fieldLabel}>
        <Icon aria-hidden="true" className="size-3.5 text-[#0d1b2a]" strokeWidth={1.75} />
        {label}
      </label>
      <div className="relative">
        {children}
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.75}
          className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2 text-[#0d1b2a]"
        />
      </div>
      {hint ? (
        <p className="truncate text-[0.6875rem] leading-tight text-[#7a7f85]">{hint}</p>
      ) : null}
    </div>
  );
}

function Select({
  id,
  options,
  defaultValue,
}: {
  id: string;
  options: { value: string | number; label: string }[];
  defaultValue: string | number;
}) {
  return (
    <select id={id} name={id} defaultValue={defaultValue} className={fieldValue}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Yacht search bar for the home hero: destination, guests, date and duration,
 * plus "more options" chips that open the full filter page (/search) and a
 * concierge prompt. Submitting opens Our yachts filtered by the choices.
 */
export function HeroSearch() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const form = useRef<HTMLFormElement>(null);

  // Reads the current selections into the shared filter shape.
  const currentFilters = (): YachtFilters => {
    const data = new FormData(form.current ?? undefined);
    return {
      ...EMPTY_FILTERS,
      region: String(data.get("destination") ?? ""),
      guests: Number(data.get("guests") ?? 0),
      duration: String(data.get("duration") ?? ""),
    };
  };

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // The date travels along for the enquiry; yacht filtering ignores it for now.
    const query = filtersToQuery(currentFilters());
    const dateParam = date ? `${query ? "&" : "?"}date=${date}` : "";
    router.push(`${userRoutes.yachts}${query}${dateParam}` as Route);
  }

  const openFilters = () =>
    router.push(`${userRoutes.search}${filtersToQuery(currentFilters())}` as Route);

  return (
    <form
      ref={form}
      onSubmit={handleSubmit}
      aria-label="Find a yacht"
      className="w-full bg-white text-[#0d1b2a] shadow-[0_18px_50px_rgba(6,26,43,0.25)]"
    >
      <div className="grid grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] [&>*]:border-b [&>*]:border-[#eef0f2] lg:[&>*]:border-b-0 lg:[&>*:not(:last-child)]:border-r">
        <Field
          id="destination"
          label="Destination"
          icon={MapPin}
          hint="Kochi, Kerala Backwaters, Lakshadweep…"
          className="col-span-2 sm:col-span-1 sm:border-r"
        >
          <Select
            id="destination"
            options={REGIONS.map((r) => ({ value: r, label: r }))}
            defaultValue="Kochi"
          />
        </Field>

        <Field id="guests" label="Guests" icon={UsersRound} className="border-r">
          <Select
            id="guests"
            options={GUEST_COUNTS.map((n) => ({
              value: n,
              label: `${n} ${n === 1 ? "guest" : "guests"}`,
            }))}
            defaultValue={8}
          />
        </Field>

        <Field id="date" label="Date" icon={CalendarDays} hint="Be flexible">
          {/* Shows "Any date" until a date is picked; the native picker sits on top. */}
          <span className={cx(fieldValue, "block", date && "invisible")} aria-hidden="true">
            Any date
          </span>
          <input
            id="date"
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.currentTarget.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            className={cx(
              fieldValue,
              "absolute inset-0 [&::-webkit-calendar-picker-indicator]:opacity-0",
              !date && "text-transparent",
            )}
          />
        </Field>

        <Field id="duration" label="Duration" icon={Clock} className="col-span-2 sm:col-span-1">
          <Select
            id="duration"
            options={DURATIONS.map((d) => ({ value: d, label: d }))}
            defaultValue="4 hours"
          />
        </Field>

        <div className="col-span-2 flex items-center p-3 lg:col-span-1 lg:p-3">
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-4 px-7 text-[0.6875rem] tracking-[0.2em] whitespace-nowrap text-[#0d1b2a] uppercase transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a] lg:h-[3.75rem] lg:w-[min(13rem,15vw)] lg:min-w-[11rem]"
            style={{ background: "linear-gradient(90deg, #f4f8fd 0%, #cfe2f8 40%, #5aa6ef 100%)" }}
          >
            Explore yachts
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-[#eef0f2] px-4 py-3.5 lg:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 items-center gap-2 text-[0.75rem] text-[#4a4f55]">
            <SlidersVertical aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            More options:
          </span>
          {/* Chips scroll sideways on narrow screens instead of wrapping. */}
          <div className="-mr-4 flex gap-2 overflow-x-auto pr-4 [scrollbar-width:none] lg:-mr-6 lg:pr-6 xl:mr-0 xl:pr-0">
            {MORE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={openFilters}
                className="h-8 shrink-0 rounded-full border border-[#d9dde1] px-3.5 text-[0.75rem] whitespace-nowrap text-[#0d1b2a] transition-colors hover:border-[#0d1b2a]"
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Image
            src="/images/home/astra-yacht-deck-sunset.png"
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1 xl:flex-none">
            <p className="text-[0.75rem] leading-tight font-medium">Need a custom experience?</p>
            <p className="mt-0.5 hidden text-[0.6875rem] leading-tight text-[#7a7f85] sm:block">
              Our concierge will help you find the right yacht.
            </p>
          </div>
          <Link
            href={userRoutes.planCharter}
            className="ml-2 flex shrink-0 items-center gap-2 border-b border-current pb-0.5 text-[0.6875rem] tracking-[0.16em] uppercase hover:opacity-70"
          >
            Talk to concierge
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
          </Link>
        </div>
      </div>
    </form>
  );
}
