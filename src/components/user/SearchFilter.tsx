"use client";

import { ArrowRight, Check, ChevronDown } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode, type SubmitEvent } from "react";

import { INK, MarinaFonts, MarinaFooter, SANS, SERIF } from "@/components/user/marina-chrome";
import { dummyFleet, type FleetYacht } from "@/components/user/OurYachts";
import {
  AMENITIES,
  DURATIONS,
  EMPTY_FILTERS,
  GUEST_COUNTS,
  PRICE_RANGES,
  REGIONS,
  SORTS,
  YACHT_TYPES,
  filterFleet,
  filtersToQuery,
  type PriceKey,
  type SortKey,
  type YachtFilters,
  type YachtType,
} from "@/components/user/yacht-search";
import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

/* Figma colours */
const BODY = "#4a4f55";
const MUTED = "#5f646a";
const BORDER = "#c9ccd0";
const GRADIENT = "linear-gradient(90deg, #f4f8fd 0%, #cfe2f8 40%, #5aa6ef 100%)";

/* Field box: 560 × 58 on the 1728px frame. */
const box =
  "flex h-[58px] w-full items-center border bg-white px-[16px] text-[16px] text-[#0d1b2a] outline-none transition-colors focus:border-[#0d1b2a] focus-visible:border-[#0d1b2a]";
const actionButton =
  "inline-flex h-[56px] w-full items-center justify-center gap-[6px] px-4 text-[12px] transition-colors sm:w-[176px]";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-[12px] leading-[16px]" style={{ color: BODY }}>
        {label}
      </label>
      <div className="relative mt-[12px]">{children}</div>
    </div>
  );
}

function Select<T extends string | number>({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: T;
  onChange: (value: string) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className={cx(box, "cursor-pointer appearance-none pr-10")}
        style={{ borderColor: BORDER }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 right-[16px] size-4 -translate-y-1/2 text-[#9aa0a6]"
      />
    </>
  );
}

/** "On board" multi-select: a field-shaped button with a checkbox list below it. */
function AmenitiesPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const toggle = (amenity: string) =>
    onChange(value.includes(amenity) ? value.filter((a) => a !== amenity) : [...value, amenity]);

  // Close on a click or tap anywhere outside the picker.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={wrapper} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        id="amenities"
        type="button"
        aria-expanded={open}
        aria-controls="amenities-list"
        onClick={() => setOpen((o) => !o)}
        className={cx(box, "justify-between gap-3 text-left")}
        style={{ borderColor: BORDER }}
      >
        <span className="truncate">
          {value.length ? (
            value.map((a, i) => (
              <span key={a}>
                {i > 0 && (
                  <span aria-hidden="true" className="mx-[6px] text-[#9aa0a6]">
                    ·
                  </span>
                )}
                {a}
              </span>
            ))
          ) : (
            <span className="text-[#7a7f85]">Anything</span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.5}
          className={cx(
            "size-4 shrink-0 text-[#9aa0a6] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <ul
          id="amenities-list"
          className="absolute inset-x-0 top-full z-10 mt-1 border bg-white py-2 shadow-[0_12px_32px_rgba(6,26,43,0.12)]"
          style={{ borderColor: BORDER }}
        >
          {AMENITIES.map((amenity) => {
            const checked = value.includes(amenity);
            return (
              <li key={amenity}>
                <label className="flex cursor-pointer items-center gap-3 px-[16px] py-[10px] text-[15px] hover:bg-[#f6f8fb]">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(amenity)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cx(
                      "flex size-[18px] items-center justify-center border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0d1b2a]",
                      checked ? "border-[#0d1b2a] bg-[#0d1b2a] text-white" : "border-[#b5b8bc]",
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={2.5} />}
                  </span>
                  {amenity}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * "Find your perfect fit." search filter page, built from the Figma design
 * (1728px frame). Starts from the selections in the URL (e.g. from the home
 * search bar); "Show N yachts" opens Our yachts with the filters applied.
 */
export default function SearchFilter({
  initialFilters,
  fleet = dummyFleet,
}: {
  initialFilters: YachtFilters;
  fleet?: FleetYacht[];
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<YachtFilters>(initialFilters);
  const set = <K extends keyof YachtFilters>(key: K, value: YachtFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  // Live count for the submit button. TODO: ask the API once it is ready.
  const count = useMemo(() => filterFleet(fleet, filters).length, [fleet, filters]);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(`${userRoutes.yachts}${filtersToQuery(filters)}` as Route);
  }

  return (
    <div className="bg-white antialiased" style={{ ...SANS, color: INK }}>
      <MarinaFonts />

      <section className="mx-auto w-full max-w-[1728px] px-5 pt-[56px] pb-[96px] lg:px-[100px] lg:pt-[123px] lg:pb-[100px]">
        <p
          className="text-[12px] leading-[16px] tracking-[0.1em] uppercase"
          style={{ color: MUTED }}
        >
          Sithara Marina / Discovery
        </p>
        {/* Figma: Switzer 400, 72px, letter-spacing -2.21px */}
        <h1
          className="mt-[32px] text-[48px] leading-[1.1] font-normal tracking-[-1.5px] lg:mt-[40px] lg:text-[72px] lg:tracking-[-2.21px]"
          style={{ ...SANS, color: INK }}
        >
          Find your{" "}
          <span className="tracking-[-1px]" style={SERIF}>
            perfect fit.
          </span>
        </h1>
        <p
          className="mt-[24px] text-[16px] leading-[26px] lg:mt-[36px] lg:text-[18px]"
          style={{ color: BODY }}
        >
          Refine your search. Your current selections stay with you.
        </p>

        <form
          onSubmit={handleSubmit}
          aria-label="Yacht filters"
          className="mt-[40px] max-w-[1144px] lg:mt-[52px]"
        >
          <div className="grid gap-x-[24px] gap-y-[32px] sm:grid-cols-2 lg:gap-y-[75px]">
            <Field id="region" label="Region">
              <Select
                id="region"
                value={filters.region}
                onChange={(v) => set("region", v)}
                options={[
                  { value: "", label: "Any region" },
                  ...REGIONS.map((r) => ({ value: r, label: r })),
                ]}
              />
            </Field>
            <Field id="guests" label="Number of guests">
              <Select
                id="guests"
                value={filters.guests}
                onChange={(v) => set("guests", Number(v))}
                options={[
                  { value: 0, label: "Any" },
                  ...GUEST_COUNTS.map((n) => ({ value: n, label: String(n) })),
                ]}
              />
            </Field>
            <Field id="duration" label="Duration">
              <Select
                id="duration"
                value={filters.duration}
                onChange={(v) => set("duration", v)}
                options={[
                  { value: "", label: "Any length" },
                  ...DURATIONS.map((d) => ({ value: d, label: d })),
                ]}
              />
            </Field>
            <Field id="sort" label="Sort by">
              <Select
                id="sort"
                value={filters.sort}
                onChange={(v) => set("sort", v as SortKey)}
                options={Object.entries(SORTS).map(([value, label]) => ({ value, label }))}
              />
            </Field>
          </div>

          <div
            role="radiogroup"
            aria-label="Yacht type"
            className="mt-[40px] grid grid-cols-3 gap-[12px] sm:flex sm:gap-[16px] lg:mt-[66px]"
          >
            {(Object.entries(YACHT_TYPES) as [YachtType, string][]).map(([value, label]) => {
              const on = filters.type === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set("type", value)}
                  className={cx(
                    actionButton,
                    "border",
                    on ? "border-transparent" : "border-[#0d1b2a] hover:bg-[#f6f8fb]",
                  )}
                  style={on ? { background: GRADIENT } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-[40px] grid gap-y-[32px] sm:max-w-[560px] lg:mt-[50px] lg:gap-y-[75px]">
            <Field id="price" label="Price range">
              <Select
                id="price"
                value={filters.price}
                onChange={(v) => set("price", v as PriceKey)}
                options={Object.entries(PRICE_RANGES).map(([value, label]) => ({ value, label }))}
              />
            </Field>
            <Field id="amenities" label="On board">
              <AmenitiesPicker value={filters.amenities} onChange={(v) => set("amenities", v)} />
            </Field>
          </div>

          <div className="mt-[48px] flex flex-col gap-[12px] sm:flex-row sm:gap-[16px] lg:mt-[67px]">
            <button
              type="submit"
              disabled={count === 0}
              className={cx(
                actionButton,
                "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
              )}
              style={{ background: GRADIENT }}
            >
              {count === 0
                ? "No yachts match"
                : `Show ${count} ${count === 1 ? "yacht" : "yachts"}`}
              {count > 0 && <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3" />}
            </button>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className={cx(actionButton, "border border-[#0d1b2a] hover:bg-[#f6f8fb]")}
            >
              Reset filters
            </button>
          </div>
          <p aria-live="polite" className="sr-only">
            {`${count} ${count === 1 ? "yacht matches" : "yachts match"} your filters`}
          </p>
        </form>
      </section>

      <MarinaFooter />
    </div>
  );
}
