"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  Toggle,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  DetailList,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import { listYachts } from "@/services/admin/fleet.service";
import {
  deletePriceRuleBatch,
  getPriceRuleBatch,
  PERCENT_MAX,
  PERCENT_MIN,
  updatePriceRuleBatch,
  type PriceRuleBatch,
  type PriceRuleBatchPatch,
} from "@/services/admin/pricing.service";

import { formatPercent, parsePercent } from "../utils/pricing-form";
import { BULK_KIND_LABEL, priceRuleErrorMessage } from "./pricing-hub";

const dateText = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/** A bulk percentage rule: its yachts, editing and removing it as one (GET/PATCH/DELETE /admin/price-rules/batches/{id}). */
export function PriceBatch({ batchId, created }: { batchId: string; created?: boolean }) {
  const batch = useAdminQuery(
    (signal) => getPriceRuleBatch(batchId, signal),
    `price-batch:${batchId}`,
  );
  const yachts = useAdminQuery(
    (signal) => listYachts({ limit: 100 }, signal),
    "price-batch-yachts",
  );

  if (!batch.data) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A rule across the fleet." />
        <div className="mt-[24px]">
          <LoadState
            loading={batch.loading}
            error={
              batch.error
                ? `Couldn't load the rule. ${priceRuleErrorMessage(batch.error)}`
                : undefined
            }
            onRetry={batch.reload}
            label="Loading rule"
          />
          {Boolean(batch.error) && !batch.loading && (
            <Link
              href={adminRoutes.availabilitySlots}
              className={cx(smallOutline, "mt-[18px] w-fit")}
              style={OUTLINE_STYLE}
            >
              Back to pricing & slots
            </Link>
          )}
        </div>
      </div>
    );
  }
  const names = new Map((yachts.data?.items ?? []).map((y) => [y.id, y.name]));
  return (
    <BatchView
      batch={batch.data}
      yachtName={(id) => names.get(id) ?? "Yacht"}
      created={created}
      onSaved={(b) => batch.setData(b)}
    />
  );
}

function BatchView({
  batch: b,
  yachtName,
  created,
  onSaved,
}: {
  batch: PriceRuleBatch;
  yachtName: (id: string) => string;
  created?: boolean;
  onSaved: (b: PriceRuleBatch) => void;
}) {
  const router = useRouter();
  const first = b.rules[0];
  const [percent, setPercent] = useState(
    first?.percent === null || !first ? "" : String(first.percent),
  );
  const [name, setName] = useState(first?.name ?? "");
  const [startsOn, setStartsOn] = useState(first?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(first?.ends_on ?? "");
  const [priority, setPriority] = useState(String(first?.priority ?? 0));
  const [active, setActive] = useState(first?.is_active ?? true);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string }>();

  // Rules per yacht.
  const byYacht = new Map<string, number>();
  for (const r of b.rules)
    if (r.yacht_id) byYacht.set(r.yacht_id, (byYacht.get(r.yacht_id) ?? 0) + 1);

  if (!first) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A rule across the fleet." />
        <p className="mt-[24px] text-[14px]" style={{ color: BODY }}>
          This bulk rule has no rules left.
        </p>
      </div>
    );
  }

  const value = parsePercent(percent);
  const errors: Record<string, string> = {};
  if (submitted) {
    if (value === null)
      errors.percent = `Enter a percentage from ${PERCENT_MIN} to +${PERCENT_MAX}, up to 2 decimals.`;
    if (first.kind === "season" && (!startsOn || !endsOn))
      errors.endsOn = "A season needs both dates.";
    if (startsOn && endsOn && endsOn < startsOn)
      errors.endsOn = "The last date can’t be before the first date.";
    if (!/^-?\d{1,4}$/.test(priority) || Math.abs(Number(priority)) > 1000)
      errors.priority = "Enter a whole number from -1000 to 1000.";
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setNotice(undefined);
    if (
      value === null ||
      (first!.kind === "season" && (!startsOn || !endsOn)) ||
      (startsOn && endsOn && endsOn < startsOn) ||
      !/^-?\d{1,4}$/.test(priority) ||
      Math.abs(Number(priority)) > 1000
    )
      return;
    const next: Required<PriceRuleBatchPatch> = {
      percent: value,
      name: name.trim() || null,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
      priority: Number(priority),
      is_active: active,
    };
    const patch: PriceRuleBatchPatch = {};
    for (const key of Object.keys(next) as (keyof PriceRuleBatchPatch)[])
      if (next[key] !== first![key]) (patch as Record<string, unknown>)[key] = next[key];
    if (!Object.keys(patch).length) {
      setNotice({ tone: "success", text: "Nothing to save: the rule is unchanged." });
      return;
    }
    setBusy(true);
    try {
      const saved = await updatePriceRuleBatch(b.batch_id, patch);
      onSaved(saved);
      setNotice({ tone: "success", text: `Saved on all ${saved.count} rules.` });
    } catch (err) {
      setNotice({ tone: "error", text: priceRuleErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setNotice(undefined);
    try {
      await deletePriceRuleBatch(b.batch_id);
      router.push(`${adminRoutes.availabilitySlots}?removed=${b.count}` as Route);
    } catch (err) {
      setNotice({ tone: "error", text: priceRuleErrorMessage(err) });
      setConfirmRemove(false);
      setBusy(false);
    }
  }

  const title =
    first.name ??
    `${BULK_KIND_LABEL[first.kind as keyof typeof BULK_KIND_LABEL] ?? first.kind} ${first.percent !== null ? formatPercent(first.percent) : ""}`;

  return (
    <div className={pagePadding}>
      <PageHeader title="A rule across the fleet." subtitle={title} />
      {created && (
        <Notice className="mt-[20px] lg:max-w-[880px]">
          Bulk rule created: {b.count} rules on {byYacht.size} yachts.
        </Notice>
      )}

      <DetailList
        className="mt-[24px] lg:max-w-[880px]"
        items={[
          ["Kind", BULK_KIND_LABEL[first.kind as keyof typeof BULK_KIND_LABEL] ?? first.kind],
          [
            "Change",
            first.percent !== null ? `${formatPercent(first.percent)} on the base price` : "—",
          ],
          [
            "Dates",
            first.starts_on || first.ends_on
              ? `${first.starts_on ? dateText(first.starts_on) : "Any date"} – ${first.ends_on ? dateText(first.ends_on) : "no end"}`
              : "Every matching date",
          ],
          ["Priority", String(first.priority)],
          ["State", first.is_active ? "Active" : "Inactive"],
          ["Rules", `${b.count} (one per yacht package)`],
        ]}
      />

      <div className="mt-[26px] overflow-x-auto lg:max-w-[880px]">
        <table className="w-full border-collapse text-left text-[11px]">
          <caption className="sr-only">Yachts in this rule</caption>
          <thead>
            <tr style={{ backgroundColor: SAND }}>
              {["Yacht", "Packages", ""].map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-[12px] py-[12px] font-normal"
                  style={{ color: BODY }}
                >
                  {h || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {[...byYacht.entries()].map(([id, count]) => (
              <tr key={id} className="border-b border-[#ebe9e4]">
                <td className="px-[12px] py-[12px] break-words">{yachtName(id)}</td>
                <td className="px-[12px] py-[12px]">{count}</td>
                <td className="px-[12px] py-[12px] text-right">
                  <Link
                    href={adminRoutes.fleetYachtPricing(id)}
                    className="underline underline-offset-2"
                  >
                    Slots & pricing<span className="sr-only"> for {yachtName(id)}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={save}
        noValidate
        aria-labelledby="edit-batch"
        className="mt-[30px] lg:max-w-[880px]"
      >
        <h2 id="edit-batch" className="text-[20px] leading-[26px]">
          Edit for every yacht
        </h2>
        <div className="mt-[14px] grid gap-x-[16px] gap-y-[18px] sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="batch-percent" required hint={`${PERCENT_MIN} to +${PERCENT_MAX}`}>
              Change to base price (%)
            </Label>
            <input
              id="batch-percent"
              inputMode="decimal"
              value={percent}
              onChange={(e) => setPercent(e.currentTarget.value.replace(/[^\d.+-]/g, ""))}
              className={input}
              {...errorProps("batch-percent", errors.percent)}
            />
            <FieldError id="batch-percent" message={errors.percent} />
          </div>
          <div>
            <Label htmlFor="batch-name" hint="optional">
              Name
            </Label>
            <input
              id="batch-name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.currentTarget.value)}
              className={input}
            />
          </div>
          <div>
            <Label htmlFor="batch-priority">Priority</Label>
            <input
              id="batch-priority"
              inputMode="numeric"
              maxLength={5}
              value={priority}
              onChange={(e) => setPriority(e.currentTarget.value.replace(/[^\d-]/g, ""))}
              className={input}
              {...errorProps("batch-priority", errors.priority)}
            />
            <FieldError id="batch-priority" message={errors.priority} />
          </div>
          <div>
            <Label htmlFor="batch-from" required={first.kind === "season"}>
              First date
            </Label>
            <input
              id="batch-from"
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.currentTarget.value)}
              className={input}
            />
          </div>
          <div>
            <Label htmlFor="batch-to" required={first.kind === "season"} hint="inclusive">
              Last date
            </Label>
            <input
              id="batch-to"
              type="date"
              value={endsOn}
              min={startsOn || undefined}
              onChange={(e) => setEndsOn(e.currentTarget.value)}
              className={input}
              {...errorProps("batch-to", errors.endsOn)}
            />
            <FieldError id="batch-to" message={errors.endsOn} />
          </div>
        </div>
        <div className="mt-[14px] max-w-[460px]">
          <Toggle
            id="batch-active"
            label="Active"
            text="Inactive rules are kept but not used for prices."
            checked={active}
            onChange={setActive}
          />
        </div>

        {notice && (
          <Notice tone={notice.tone} className="mt-[16px]">
            {notice.text}
          </Notice>
        )}

        <div className="mt-[20px] flex flex-wrap gap-[14px]">
          <button
            type="submit"
            disabled={busy}
            className={cx(smallPrimary, "min-w-[150px]")}
            style={PRIMARY_STYLE}
          >
            {busy && !confirmRemove ? "Saving…" : `Save for all ${b.count} rules`}
          </button>
          {!confirmRemove && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmRemove(true)}
              className={cx(smallOutline, "min-w-[150px]")}
              style={OUTLINE_STYLE}
            >
              Remove this bulk rule
            </button>
          )}
          <Link
            href={adminRoutes.availabilitySlots}
            className={cx(smallOutline, "min-w-[118px]")}
            style={OUTLINE_STYLE}
          >
            Back to pricing & slots
          </Link>
        </div>

        {confirmRemove && (
          <div
            role="alertdialog"
            aria-labelledby="remove-batch"
            className="mt-[18px] border border-[#dcdad5] bg-white px-[18px] py-[16px] lg:max-w-[580px]"
          >
            <p id="remove-batch" className="text-[14px]">
              Remove all {b.count} rules from {byYacht.size} yachts?
            </p>
            <p className="mt-[6px] text-[12px]" style={{ color: BODY }}>
              Prices go back to each yacht’s other rules. Confirmed bookings keep their price.
            </p>
            <div className="mt-[12px] flex flex-wrap gap-[10px]">
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                className={smallPrimary}
                style={PRIMARY_STYLE}
              >
                {busy ? "Removing…" : "Remove bulk rule"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmRemove(false)}
                className={smallOutline}
                style={OUTLINE_STYLE}
              >
                Keep it
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
