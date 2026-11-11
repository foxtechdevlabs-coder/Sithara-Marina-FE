"use client";

import type { ReactNode } from "react";

import { BODY, GRADIENT, INK, MUTED, SAND } from "@/components/admin/admin-theme";
import { cx } from "@/lib/cx";

/* Building blocks shared by the booking screens (admin Figma A08–A13, A38). */

export const pagePadding =
  "px-[20px] pt-[20px] pb-[48px] lg:pt-[33px] lg:pr-[47px] lg:pb-[60px] lg:pl-[46px]";

/** Two-column form grid of the booking forms. */
export const formGrid = "grid gap-x-[18px] gap-y-[24px] lg:max-w-[580px] lg:grid-cols-2";

/** Smaller buttons of the booking screens. */
export const smallPrimary =
  "flex h-[44px] items-center justify-center gap-[6px] px-[20px] text-[11px] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
export const smallOutline =
  "flex h-[44px] items-center justify-center gap-[6px] border bg-white px-[18px] text-[11px] transition-colors hover:bg-[#f2f1ee] disabled:cursor-not-allowed disabled:opacity-60";

/** "Sithara Marina / Admin", the headline and the line under it. */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <>
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>
      <h1 className="mt-[18px] text-[30px] leading-[1.15] font-normal tracking-[-0.8px] lg:mt-[28px] lg:text-[43px] lg:tracking-[-1.3px]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-[16px] text-[12px] leading-[19px] lg:mt-[24px]" style={{ color: BODY }}>
          {subtitle}
        </p>
      )}
    </>
  );
}

/** Sand panel with a small heading, e.g. "Before you create". */
export function InfoPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx("px-[18px] py-[16px] lg:px-[22px]", className)}
      style={{ backgroundColor: SAND }}
    >
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        {title}
      </p>
      <div className="mt-[8px] text-[12px] leading-[19px]">{children}</div>
    </div>
  );
}

/** White bordered card, e.g. "Current departure". */
export function Card({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx("border border-[#dcdad5] bg-white px-[18px] py-[20px] lg:px-[22px]", className)}
    >
      {title && <h2 className="text-[20px] leading-[26px] lg:text-[22px]">{title}</h2>}
      <div className={title ? "mt-[8px] text-[12px] leading-[19px]" : ""} style={{ color: BODY }}>
        {children}
      </div>
    </div>
  );
}

/** Dark status tag, e.g. "Booking confirmed". */
export function StatusTag({
  children,
  tone = "dark",
}: {
  children: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={cx(
        "inline-flex h-[24px] w-fit items-center px-[10px] text-[10px]",
        tone === "dark" ? "text-white" : "border",
      )}
      style={tone === "dark" ? { backgroundColor: "#22382c" } : { borderColor: INK }}
    >
      {children}
    </span>
  );
}

/** A two-option tab bar, e.g. Offline payment / Payment link. */
export function SegmentTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-[10px]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "flex h-[38px] min-w-[112px] items-center justify-center border px-[16px] text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a] lg:h-[40px] lg:min-w-[120px]",
              on ? "border-transparent" : "bg-white hover:bg-[#f2f1ee]",
            )}
            style={on ? { background: GRADIENT } : { borderColor: INK }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Label / value pairs, e.g. "Lead guest — Ananya Menon". */
export function DetailList({
  items,
  className,
}: {
  items: [string, ReactNode][];
  className?: string;
}) {
  return (
    <dl className={cx("text-[13px] leading-[20px]", className)}>
      {items.map(([term, value]) => (
        <div
          key={term}
          className="mt-[14px] first:mt-0 lg:mt-[18px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-[18px]"
        >
          <dt className="text-[11px] lg:text-[12px]" style={{ color: BODY }}>
            {term}
          </dt>
          <dd className="mt-[4px] break-words lg:mt-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
