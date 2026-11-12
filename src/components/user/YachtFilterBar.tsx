"use client";

import { SlidersHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useId, type ReactNode } from "react";

import { INK } from "@/components/user/marina-chrome";
import { SearchCombobox, type SearchComboboxProps } from "@/components/user/SearchCombobox";
import {
  EMPTY_FILTERS,
  GUEST_COUNTS,
  SORTS,
  filtersToQuery,
  guestDigits,
  parseGuestCount,
  priceBands,
  type SortKey,
  type YachtFilters,
} from "@/components/user/yacht-search";
import { userRoutes } from "@/constants/routes";
import { formatMinorUnits } from "@/features/user/yachts/utils/yacht-view";
import { cx } from "@/lib/cx";
import type { YachtFilterOptions } from "@/services/user/yachts.service";

/* Same field look as the Figma "Find your perfect fit." page (SearchFilter). */
const BODY = "#4a4f55";
const BORDER = "#c9ccd0";
const GRADIENT = "linear-gradient(90deg, #f4f8fd 0%, #cfe2f8 40%, #5aa6ef 100%)";

/** The Figma field box, for typing: a text cursor instead of a select's pointer. */
const typeBox =
  "flex h-[58px] w-full items-center border bg-white px-[16px] text-[16px] text-[#0d1b2a] outline-none transition-colors focus:border-[#0d1b2a] disabled:cursor-wait";

function FilterCombobox({
  label,
  ...props
}: { label: string } & Omit<SearchComboboxProps, "id" | "className" | "style">) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-[12px] leading-[16px]" style={{ color: BODY }}>
        {label}
      </label>
      <div className="mt-[12px]">
        <SearchCombobox {...props} id={id} className={typeBox} style={{ borderColor: BORDER }} />
      </div>
    </div>
  );
}

/** A price choice as one string: "min-max" in paise, either side blank; "" = any price. */
const priceKey = (min: number | null, max: number | null) =>
  min === null && max === null ? "" : `${min ?? ""}-${max ?? ""}`;

function parsePriceKey(key: string): { minPrice: number | null; maxPrice: number | null } {
  const [min = "", max = ""] = key.split("-");
  return { minPrice: min ? Number(min) : null, maxPrice: max ? Number(max) : null };
}

/**
 * A typed budget, e.g. "50000", "₹ 50,000" or "50k", in rupees: searched as
 * "up to" that amount (GET /yachts `max_price`, in paise). Null when it is not one.
 */
function parseBudget(text: string): string | null {
  const match = /^(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(k|l|lakh)?$/i.exec(text.trim());
  if (!match?.[1]) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  const unit = match[2]?.toLowerCase();
  const rupees = amount * (unit === "k" ? 1_000 : unit ? 100_000 : 1);
  if (!Number.isFinite(rupees) || rupees <= 0) return null;
  return priceKey(null, Math.round(rupees * 100));
}

/**
 * Filters above Our yachts. Each change goes to `onChange` (YachtListing), which
 * shows the result at once and asks GET /yachts with the backend's own
 * parameters (`destination` for the location, `guests`, `type`,
 * `min_price`/`max_price`, `sort`), whose answer is always the one kept.
 * Choices come from GET /yachts/filters. Duration and "On board" have no API
 * parameter: they stay on the full filter page and are kept in the URL here.
 * The fields never lock: the next change can be made while an answer is coming.
 */
export function YachtFilterBar({
  filters,
  options,
  onChange,
  updating = false,
  children,
}: {
  filters: YachtFilters;
  /** Null when GET /yachts/filters failed: each filter then offers only "Any". */
  options: YachtFilterOptions | null;
  /** Called with every new set of filters. */
  onChange: (next: YachtFilters) => void;
  /** No result can be shown yet for these filters: the old list is dimmed. */
  updating?: boolean;
  /** The results. */
  children: ReactNode;
}) {
  const apply = onChange;
  const set = <K extends keyof YachtFilters>(key: K, value: YachtFilters[K]) =>
    apply({ ...filters, [key]: value });

  const bands = options ? priceBands(options) : [];
  const currentPrice = priceKey(filters.minPrice, filters.maxPrice);
  const currency = options?.currency ?? "INR";
  const priceOptions = bands.map((band) => ({ value: priceKey(band.min, band.max), label: band.label }));
  // A typed budget, or a range from a shared link, is named in words.
  if (currentPrice && !priceOptions.some((option) => option.value === currentPrice)) {
    const { minPrice, maxPrice } = filters;
    priceOptions.push({
      value: currentPrice,
      label:
        minPrice !== null && maxPrice !== null
          ? `${formatMinorUnits(minPrice, currency)} – ${formatMinorUnits(maxPrice, currency)}`
          : minPrice !== null
            ? `From ${formatMinorUnits(minPrice, currency)}`
            : `Up to ${formatMinorUnits(maxPrice, currency)}`,
    });
  }
  // The same for a location or type from a shared link that the options no longer list.
  const withCurrent = (list: string[], current: string) =>
    current && !list.includes(current) ? [...list, current] : list;

  const active = filtersToQuery(filters) !== "";

  return (
    <>
      <form
        aria-label="Filter yachts"
        onSubmit={(event) => event.preventDefault()}
        className="motion-safe:animate-fade-up mt-[56px] lg:mt-[80px]"
      >
        <div className="grid gap-x-[24px] gap-y-[24px] sm:grid-cols-2 xl:grid-cols-4">
          {/* Type to find a city; `destination` is an exact city, so only a listed one applies. */}
          <FilterCombobox
            label="Location"
            value={filters.region}
            onCommit={(value) => set("region", value)}
            options={withCurrent(options?.destinations ?? [], filters.region).map((city) => ({
              value: city,
              label: city.charAt(0).toUpperCase() + city.slice(1),
            }))}
            placeholder="Search location"
            emptyText="No matching location"
          />
          {/* Any whole number: `guests` is "at least this many". */}
          <FilterCombobox
            label="Number of guests"
            value={filters.guests ? String(filters.guests) : ""}
            onCommit={(value) => set("guests", Number(value || 0))}
            options={GUEST_COUNTS.map((count) => ({ value: String(count), label: `${count}+ guests` }))}
            placeholder="Any number"
            parseCustom={parseGuestCount}
            sanitize={guestDigits}
            inputMode="numeric"
            emptyText="Press Enter to use this number"
          />
          {/* A band from GET /yachts/filters, or a typed budget searched as max_price. */}
          <FilterCombobox
            label="Price range"
            value={currentPrice}
            onCommit={(value) => apply({ ...filters, ...parsePriceKey(value) })}
            options={priceOptions}
            placeholder="Any price or budget"
            parseCustom={parseBudget}
            emptyText="Type an amount in ₹ (e.g. 50000) and press Enter"
          />
          {/* Only the backend's sort orders; typing narrows the list. */}
          <FilterCombobox
            label="Sort by"
            value={filters.sort}
            onCommit={(value) => set("sort", (value || "recommended") as SortKey)}
            options={Object.entries(SORTS).map(([value, label]) => ({ value, label }))}
            placeholder="Recommended"
            defaultValue="recommended"
            emptyText="No matching order"
          />
        </div>

        <div className="mt-[24px] flex flex-col gap-[20px] lg:flex-row lg:items-center lg:justify-between">
          <div
            role="radiogroup"
            aria-label="Yacht type"
            className="flex flex-wrap gap-[12px]"
          >
            {[
              { value: "", label: "All yachts" },
              ...withCurrent(options?.types ?? [], filters.type).map((type) => ({
                value: type,
                label: type,
              })),
            ].map(({ value, label }) => {
              const on = filters.type === value;
              return (
                <button
                  key={value || "all"}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => !on && set("type", value)}
                  className={cx(
                    "inline-flex h-[48px] min-w-[132px] items-center justify-center border px-5 text-[12px] transition-colors duration-300 disabled:cursor-wait",
                    on ? "border-transparent" : "border-[#0d1b2a] hover:bg-[#f6f8fb]",
                  )}
                  style={on ? { background: GRADIENT } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-[24px] text-[12px] tracking-[0.18em] uppercase">
            <Link
              href={`${userRoutes.search}${filtersToQuery(filters)}` as Route}
              className="inline-flex items-center gap-[10px] border-b pb-1"
              style={{ borderColor: INK }}
            >
              <SlidersHorizontal aria-hidden="true" strokeWidth={1.5} className="size-[14px]" />
              More filters
            </Link>
            {active && (
              <button
                type="button"
                onClick={() => apply(EMPTY_FILTERS)}
                className="border-b border-transparent pb-1 tracking-[0.18em] uppercase hover:border-current disabled:cursor-wait"
                style={{ color: "#7a7f85" }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        <p aria-live="polite" className="sr-only">
          {updating ? "Updating the yachts…" : ""}
        </p>
      </form>

      <div
        aria-busy={updating}
        className={cx("transition-opacity duration-300", updating && "opacity-50")}
      >
        {children}
      </div>
    </>
  );
}
