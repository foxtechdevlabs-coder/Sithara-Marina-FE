import Image from "next/image";
import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export interface CharterSummaryRow {
  label: string;
  value: ReactNode;
}

export interface CharterSummaryCardProps {
  /** Navy on the booking page (Figma C19); pearl beside checkout sign-in. */
  tone: "dark" | "pearl";
  yachtName: string;
  /** "Kochi · 4 hours"; left out when empty. */
  subtitle?: string;
  imageUrl?: string | null;
  /** When and who: departure, time, company. */
  facts: readonly CharterSummaryRow[];
  /** The backend's price lines, already formatted. */
  prices?: readonly CharterSummaryRow[];
  /** Formatted total; left out while it is unknown. */
  total?: string | null;
  /** Shown instead of the prices, e.g. while they load. */
  pricesFallback?: ReactNode;
  /** Small print under the total. */
  note?: string;
  /** Sizes hint for the photo. */
  imageSizes?: string;
}

/** "Your time on the water": the charter's photo, facts and price, in one panel. */
export function CharterSummaryCard({
  tone,
  yachtName,
  subtitle,
  imageUrl,
  facts,
  prices = [],
  total,
  pricesFallback,
  note = "All amounts in INR. Your charter inclusions and applicable taxes are reviewed before payment.",
  imageSizes = "(min-width: 1280px) 22rem, 100vw",
}: CharterSummaryCardProps) {
  const isDark = tone === "dark";
  const rule = isDark ? "border-white/15" : "border-navy-ink/15";
  const muted = isDark ? "text-white/65" : "text-body";

  const rows = (items: readonly CharterSummaryRow[]) => (
    <dl className={cx("space-y-4 border-t pt-5", rule)}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className={cx("text-[11px] leading-snug", muted)}>{item.label}</dt>
          <dd className="mt-1 text-[13px] leading-snug">{item.value}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <section
      aria-label={`Your time on the water: ${yachtName}`}
      className={cx("p-5 sm:p-6", isDark ? "bg-brand-950 text-white" : "bg-pearl text-navy-ink")}
    >
      <p className={cx("text-[10px] leading-none tracking-[0.14em] uppercase", muted)}>
        Your time on the water
      </p>
      {imageUrl ? (
        <div className="relative mt-4 aspect-[16/10] w-full overflow-hidden bg-black/10">
          <Image
            src={imageUrl}
            alt={`${yachtName} at sea`}
            fill
            sizes={imageSizes}
            // Backend photo hosts are not in next.config's image allow-list.
            unoptimized
            className="object-cover"
          />
        </div>
      ) : null}
      <h2 className="mt-5 text-[1.75rem] leading-tight font-normal tracking-[-0.01em]">
        {yachtName}
      </h2>
      {subtitle ? <p className={cx("mt-2 text-[12px]", muted)}>{subtitle}</p> : null}

      <div className="mt-5 space-y-5">
        {rows(facts)}
        {pricesFallback ?? (prices.length ? rows(prices) : null)}
        {total ? (
          <div className={cx("border-t pt-5", rule)}>
            <p className={cx("text-[10px] leading-none tracking-[0.14em] uppercase", muted)}>
              Total
            </p>
            <p className="mt-3 text-[2rem] leading-none tracking-[-0.01em]">{total}</p>
            <p className={cx("mt-4 text-[11px] leading-relaxed", muted)}>{note}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
