"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BODY } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
  Toggle,
} from "@/components/admin/form-parts";
import { allActiveYachts, searchYachts } from "@/components/admin/lookups";
import { MultiSearchSelect } from "@/components/admin/multi-search-select";
import { SearchSelect, type SearchOption } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { cx } from "@/lib/cx";
import type { Yacht } from "@/services/admin/fleet.service";
import {
  BULK_RULE_KINDS,
  createBulkPriceRules,
  PERCENT_MAX,
  PERCENT_MIN,
  type BulkRuleKind,
} from "@/services/admin/pricing.service";
import { isApiError } from "@/services/http/api-error";

import { formatPaise, formatPercent, parsePercent } from "../utils/pricing-form";

const MAX_YACHTS = 100;

export const BULK_KIND_LABEL: Record<BulkRuleKind, string> = {
  holiday: "Holiday",
  season: "Season",
  weekend: "Weekend",
};

/** A short message for a failed price rule request. */
export function priceRuleErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "INVALID_PRICE_RULE")
      return "Check the rule: a season needs both dates in order, and every yacht needs an active package.";
    if (error.code === "YACHT_NOT_FOUND")
      return "One of the chosen yachts no longer exists. Remove it and try again.";
    if (error.code === "NOT_PUBLISHABLE")
      return "A visible yacht would lose its last active base price. Nothing was saved.";
    if (error.status === 403) return "Your account doesn’t have permission to change prices.";
  }
  return fleetErrorMessage(error, "This price rule");
}

/**
 * Pricing & slots: open one yacht's packages and prices, or add one percent
 * rule to many yachts at once (POST /admin/price-rules/bulk).
 */
export function PricingHub({ removed }: { removed?: string }) {
  const router = useRouter();
  const [yachtId, setYachtId] = useState("");
  return (
    <div className={pagePadding}>
      <PageHeader
        title="Prices, set with care."
        subtitle="Each yacht’s packages and prices, and percentage rules across the fleet."
      />
      {removed && (
        <Notice className="mt-[20px] lg:max-w-[880px]">
          Bulk rule removed ({removed} rules). Prices follow each yacht’s other rules again.
        </Notice>
      )}

      <section
        aria-labelledby="one-yacht"
        className="mt-[24px] border border-[#e3e1dc] bg-white px-[18px] py-[20px] lg:mt-[30px] lg:max-w-[880px] lg:px-[22px]"
      >
        <h2 id="one-yacht" className="text-[20px] leading-[26px]">
          One yacht
        </h2>
        <p className="mt-[6px] text-[12px]" style={{ color: BODY }}>
          Packages, start times, base prices and fixed or percentage rules for a single yacht.
        </p>
        <div className="mt-[16px] flex flex-wrap items-end gap-[14px]">
          <div className="w-full sm:w-[360px]">
            <Label htmlFor="pricing-yacht">Yacht</Label>
            <SearchSelect
              id="pricing-yacht"
              value={yachtId}
              onChange={(v) => setYachtId(v)}
              load={searchYachts()}
              placeholder="Search yachts by name"
              noResults="No yacht matches."
            />
          </div>
          <button
            type="button"
            disabled={!yachtId}
            onClick={() => router.push(adminRoutes.fleetYachtPricing(yachtId))}
            className={cx(smallPrimary, "min-w-[150px]")}
            style={PRIMARY_STYLE}
          >
            Open slots & pricing
          </button>
        </div>
      </section>

      <BulkRuleForm />
    </div>
  );
}

function BulkRuleForm() {
  const router = useRouter();
  const [yachts, setYachts] = useState<SearchOption<Yacht>[]>([]);
  const [kind, setKind] = useState<BulkRuleKind>("holiday");
  const [percent, setPercent] = useState("");
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [priority, setPriority] = useState("0");
  const [active, setActive] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [failure, setFailure] = useState("");
  const [allNote, setAllNote] = useState("");

  const value = parsePercent(percent);
  const errors: Record<string, string> = {};
  if (submitted) {
    if (!yachts.length) errors.yachts = "Choose at least one yacht.";
    if (value === null)
      errors.percent = `Enter a percentage from ${PERCENT_MIN} to +${PERCENT_MAX}, up to 2 decimals.`;
    if (kind === "season" && !startsOn) errors.startsOn = "A season needs a first date.";
    if (kind === "season" && !endsOn) errors.endsOn = "A season needs a last date.";
    if (startsOn && endsOn && endsOn < startsOn)
      errors.endsOn = "The last date can’t be before the first date.";
    if (!/^-?\d{1,4}$/.test(priority) || Math.abs(Number(priority)) > 1000)
      errors.priority = "Enter a whole number from -1000 to 1000.";
    if (name.trim().length > 100) errors.name = "Use 100 characters or fewer.";
  }

  async function addAllActive() {
    setLoadingAll(true);
    setAllNote("");
    try {
      const { options, total } = await allActiveYachts(undefined, MAX_YACHTS);
      const known = new Set(yachts.map((y) => y.value));
      setYachts([...yachts, ...options.filter((o) => !known.has(o.value))].slice(0, MAX_YACHTS));
      if (total > MAX_YACHTS)
        setAllNote(
          `Added the first ${MAX_YACHTS} of ${total} active yachts; run another bulk rule for the rest.`,
        );
    } catch (err) {
      setAllNote(`Couldn’t load the fleet. ${fleetErrorMessage(err, "This list")}`);
    } finally {
      setLoadingAll(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setFailure("");
    const ok =
      yachts.length > 0 &&
      value !== null &&
      !(kind === "season" && (!startsOn || !endsOn)) &&
      !(startsOn && endsOn && endsOn < startsOn) &&
      /^-?\d{1,4}$/.test(priority) &&
      Math.abs(Number(priority)) <= 1000 &&
      name.trim().length <= 100;
    if (!ok) return;
    setBusy(true);
    try {
      const batch = await createBulkPriceRules({
        yacht_ids: yachts.map((y) => y.value),
        kind,
        percent: value!,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(startsOn ? { starts_on: startsOn } : {}),
        ...(endsOn ? { ends_on: endsOn } : {}),
        priority: Number(priority),
        is_active: active,
      });
      router.push(`${adminRoutes.priceBatch(batch.batch_id)}?created=1` as Route);
    } catch (err) {
      setFailure(priceRuleErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={save}
      noValidate
      aria-labelledby="bulk-rule"
      className="mt-[24px] border border-[#e3e1dc] bg-white px-[18px] py-[20px] lg:max-w-[880px] lg:px-[22px]"
    >
      <h2 id="bulk-rule" className="text-[20px] leading-[26px]">
        Bulk percentage rule
      </h2>
      <p className="mt-[6px] text-[12px] leading-[18px]" style={{ color: BODY }}>
        One rule on every active package of each chosen yacht, moving its base price by a percentage
        — for example Christmas +20% across the fleet. The rules are created together and can be
        edited or removed together.
      </p>

      <div className="mt-[18px]">
        <Label htmlFor="bulk-yachts" required>
          Yachts
        </Label>
        <MultiSearchSelect<Yacht>
          id="bulk-yachts"
          values={yachts}
          onChange={setYachts}
          load={searchYachts({ status: "active" })}
          max={MAX_YACHTS}
          placeholder="Search active yachts to add"
          noResults="No active yacht matches."
          invalid={errors.yachts}
          extra={
            <button
              type="button"
              disabled={loadingAll || yachts.length >= MAX_YACHTS}
              onClick={() => void addAllActive()}
              className="text-[11px] underline underline-offset-2 disabled:opacity-50"
            >
              {loadingAll ? "Adding…" : "Add all active yachts"}
            </button>
          }
        />
        <FieldError id="bulk-yachts" message={errors.yachts} />
        {allNote && (
          <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
            {allNote}
          </p>
        )}
      </div>

      <div className="mt-[20px] grid gap-x-[16px] gap-y-[18px] sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="bulk-kind" required>
            Kind
          </Label>
          <SelectBox
            id="bulk-kind"
            value={kind}
            onChange={(v) => setKind(v as BulkRuleKind)}
            options={BULK_RULE_KINDS.map((k) => ({ value: k, label: BULK_KIND_LABEL[k] }))}
          />
        </div>
        <div>
          <Label htmlFor="bulk-percent" required hint={`${PERCENT_MIN} to +${PERCENT_MAX}`}>
            Change to base price (%)
          </Label>
          <input
            id="bulk-percent"
            inputMode="decimal"
            value={percent}
            placeholder="20 or -15"
            onChange={(e) => setPercent(e.currentTarget.value.replace(/[^\d.+-]/g, ""))}
            className={input}
            {...errorProps("bulk-percent", errors.percent)}
          />
          <FieldError id="bulk-percent" message={errors.percent} />
          {!errors.percent && value !== null && (
            <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
              {formatPercent(value)}: a ₹ 40,000 base becomes{" "}
              {formatPaise(Math.round(4_000_000 * (1 + value / 100)))}.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="bulk-name" hint="optional">
            Name
          </Label>
          <input
            id="bulk-name"
            value={name}
            maxLength={100}
            placeholder="e.g. Christmas +20%"
            onChange={(e) => setName(e.currentTarget.value)}
            className={input}
            {...errorProps("bulk-name", errors.name)}
          />
          <FieldError id="bulk-name" message={errors.name} />
        </div>
        <div>
          <Label
            htmlFor="bulk-from"
            required={kind === "season"}
            hint={kind === "season" ? undefined : "optional"}
          >
            First date
          </Label>
          <input
            id="bulk-from"
            type="date"
            value={startsOn}
            onChange={(e) => setStartsOn(e.currentTarget.value)}
            className={input}
            {...errorProps("bulk-from", errors.startsOn)}
          />
          <FieldError id="bulk-from" message={errors.startsOn} />
        </div>
        <div>
          <Label htmlFor="bulk-to" required={kind === "season"} hint="inclusive">
            Last date
          </Label>
          <input
            id="bulk-to"
            type="date"
            value={endsOn}
            min={startsOn || undefined}
            onChange={(e) => setEndsOn(e.currentTarget.value)}
            className={input}
            {...errorProps("bulk-to", errors.endsOn)}
          />
          <FieldError id="bulk-to" message={errors.endsOn} />
        </div>
        <div>
          <Label htmlFor="bulk-priority" hint="higher wins between rules of one kind">
            Priority
          </Label>
          <input
            id="bulk-priority"
            inputMode="numeric"
            value={priority}
            maxLength={5}
            onChange={(e) => setPriority(e.currentTarget.value.replace(/[^\d-]/g, ""))}
            className={input}
            {...errorProps("bulk-priority", errors.priority)}
          />
          <FieldError id="bulk-priority" message={errors.priority} />
        </div>
      </div>
      <div className="mt-[14px] max-w-[460px]">
        <Toggle
          id="bulk-active"
          label="Active"
          text="Inactive rules are kept but not used for prices."
          checked={active}
          onChange={setActive}
        />
      </div>

      <InfoPanel title="How it applies" className="mt-[16px]">
        Holiday beats season, season beats weekend, and weekend beats base; priority breaks ties. A
        percentage rule follows each package’s base price, so a later base change carries through.
      </InfoPanel>

      {failure && (
        <Notice tone="error" className="mt-[16px]">
          {failure}
        </Notice>
      )}

      <div className="mt-[20px] flex flex-wrap gap-[14px]">
        <button
          type="submit"
          disabled={busy}
          className={cx(smallPrimary, "min-w-[150px]")}
          style={PRIMARY_STYLE}
        >
          {busy
            ? "Creating…"
            : `Create rule for ${yachts.length || "the"} yacht${yachts.length === 1 ? "" : "s"}`}
        </button>
        <Link
          href={adminRoutes.fleet}
          className={cx(smallOutline, "min-w-[118px]")}
          style={OUTLINE_STYLE}
        >
          Yachts
        </Link>
      </div>
    </form>
  );
}
