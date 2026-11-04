"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { BODY, MUTED, SAND } from "@/components/admin/admin-theme";
import { LoadState, Notice, PRIMARY_STYLE, primaryButton } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { formatPaise, rupeesToPaise } from "@/features/admin/pricing/utils/pricing-form";
import { formatTime } from "@/lib/time";
import { getSlotTypes } from "@/services/admin/fleet.service";
import { createPriceRule, listPriceRules } from "@/services/admin/pricing.service";

import { useAdminQuery } from "../hooks/use-admin-query";
import { PACKAGES, draftFromSaved, priceChanges } from "../utils/booking-setup";
import { fleetErrorMessage } from "../utils/fleet-error-message";

/** On with a saved price is bookable; off is hidden and keeps its price. */
function statusOf(enabled: boolean, saved: number | null, workedOut: number | null) {
  if (!enabled) return "Hidden";
  if (saved) return "Bookable";
  return workedOut ? "Price not saved" : "Needs a price";
}

/**
 * The yacht's packages on the admin yacht page, changed on the edit form. A
 * package with no saved price shows hourly rate × hours, with a button to save
 * those prices, because it can't be booked until then.
 * GET /admin/yachts/{id}/slot-types and …/price-rules.
 */
export function PackagesPanel({
  yachtId,
  hourlyRate,
}: {
  yachtId: string;
  /** Paise per hour. */
  hourlyRate: number | null;
}) {
  const query = useAdminQuery(async (signal) => {
    const [setup, rules] = await Promise.all([
      getSlotTypes(yachtId, signal),
      listPriceRules(yachtId, { kind: "base" }, signal),
    ]);
    return { setup, rules };
  }, yachtId);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const busy = useRef(false);

  const saved = query.data;
  const packages = saved ? draftFromSaved(saved).packages.filter((p) => p.id) : [];
  const workedOut = saved ? draftFromSaved(saved, hourlyRate) : null;
  const missing =
    saved && workedOut
      ? priceChanges(workedOut, saved.setup, saved.rules).flatMap((c) =>
          c.type === "create" ? [c.input] : [],
        )
      : [];

  async function savePrices() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setProblem("");
    try {
      for (const price of missing) await createPriceRule(yachtId, price);
    } catch (err) {
      setProblem(`Couldn't save the prices. ${fleetErrorMessage(err)}`);
    }
    // Reload either way: some of the prices may have saved.
    query.reload();
    busy.current = false;
    setSaving(false);
  }

  return (
    <section
      aria-labelledby="packages-title"
      className="border border-[#e3e1dc] bg-white px-[20px] pt-[26px] pb-[28px] sm:px-[28px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
        <h2 id="packages-title" className="text-[20px] leading-[26px]">
          Packages
        </h2>
        <Link
          href={adminRoutes.fleetYachtEdit(yachtId)}
          className="text-[13px] underline underline-offset-2 hover:opacity-70"
        >
          Edit packages
        </Link>
      </div>

      {!saved ? (
        <LoadState
          loading={query.loading}
          label="Loading packages"
          error={query.error ? `Couldn't load the packages. ${fleetErrorMessage(query.error)}` : ""}
          onRetry={query.reload}
        />
      ) : packages.length === 0 ? (
        <p className="mt-[18px] text-[14px]" style={{ color: BODY }}>
          No packages yet.
        </p>
      ) : (
        <>
          <ul className="mt-[18px] divide-y divide-[#eceae6] border-y border-[#eceae6]">
            {packages.map((p) => {
              const fixed = p.custom ? undefined : PACKAGES.find((f) => f.hours === p.hours);
              const savedPrice = rupeesToPaise(p.price);
              const price = savedPrice ?? (hourlyRate ? Math.round(hourlyRate * p.hours) : null);
              const starts = saved.setup.slot_types.find((s) => s.id === p.id)?.start_times ?? [];
              const sorted = [...starts].sort();
              return (
                <li
                  key={p.key}
                  className="grid gap-[4px] py-[12px] text-[14px] sm:grid-cols-[1.4fr_1fr_120px] sm:items-center sm:gap-[16px]"
                >
                  <span>
                    {fixed?.title ?? p.name}
                    {fixed && (
                      <span className="ml-[8px] text-[12px]" style={{ color: MUTED }}>
                        {fixed.tag}
                      </span>
                    )}
                    {sorted.length > 0 && (
                      <span className="block text-[12px]" style={{ color: MUTED }}>
                        Starts {formatTime(sorted[0]!)}
                        {sorted.length > 1 && ` – ${formatTime(sorted.at(-1)!)}`}
                      </span>
                    )}
                  </span>
                  <span>{price ? formatPaise(price) : "—"}</span>
                  <span
                    className="w-fit px-[9px] py-[3px] text-[12px] sm:justify-self-end"
                    style={{ backgroundColor: SAND, color: "#3d4248" }}
                  >
                    {statusOf(p.enabled, savedPrice, price)}
                  </span>
                </li>
              );
            })}
          </ul>
          {problem && (
            <Notice tone="error" className="mt-[14px]">
              {problem}
            </Notice>
          )}
          {missing.length > 0 && hourlyRate !== null && (
            <div className="mt-[16px]">
              <p className="text-[12px] leading-[18px]" style={{ color: BODY }}>
                Worked out from {formatPaise(hourlyRate)} per hour × hours. Guests can&rsquo;t book
                a package until its price is saved.
              </p>
              <button
                type="button"
                onClick={() => void savePrices()}
                disabled={saving}
                className={`${primaryButton} mt-[12px]`}
                style={PRIMARY_STYLE}
              >
                {saving ? "Saving…" : "Save these prices"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
