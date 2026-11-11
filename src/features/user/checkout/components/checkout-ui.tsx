import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { INK, SANS, SERIF } from "@/components/user/marina-chrome";
import { PRIMARY_GRADIENT } from "@/features/user/auth/components/auth-form-styles";
import { cx } from "@/lib/cx";

/** The Figma look shared by the availability, checkout and confirmation pages. */
export const BODY = "#4a4f55";
export const MUTED = "#7a7f85";
export const BORDER = "#c9ccd0";
export const FRAME = "mx-auto w-full max-w-[1728px] px-5 lg:px-[100px]";

export const inputClass =
  "h-[58px] w-full border border-[#c9ccd0] bg-white px-[16px] text-[16px] text-[#0d1b2a] outline-none focus:border-[#0d1b2a] aria-[invalid=true]:border-[#b42318]";
export const labelClass = "block text-[12px] leading-[16px] text-[#4a4f55]";
export const fieldErrorClass = "mt-[8px] text-[13px] leading-[18px] text-[#b42318]";
export const textLinkClass = "underline underline-offset-2";

const buttonBase =
  "inline-flex min-h-[55px] items-center justify-center gap-[12px] px-[24px] text-center text-[13px] text-[#0d1b2a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] disabled:cursor-not-allowed disabled:opacity-50";

/** Gradient call to action; pair with `style={primaryButtonStyle}`. */
export const primaryButtonClass = `${buttonBase} transition-opacity hover:opacity-90`;
export const primaryButtonStyle = { background: PRIMARY_GRADIENT };

/** White, thin-navy-bordered button. */
export const secondaryButtonClass = `${buttonBase} border border-[#0d1b2a] transition-colors enabled:hover:bg-[#0d1b2a] enabled:hover:text-white`;

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      className="text-[28px] leading-[40px] tracking-[-0.5px] lg:text-[32px]"
      style={{ ...SANS, color: INK }}
    >
      {children}
    </h2>
  );
}

export function Notice({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
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

export function Loading({ label }: { label: string }) {
  return (
    <div className="text-brand-600 mt-[20px]">
      <Spinner label={label} />
    </div>
  );
}

interface CheckoutPageProps {
  /** Plain part of the heading; `headingSerif` follows it in the serif face. */
  heading: string;
  headingSerif: string;
  intro?: ReactNode;
  /** Right-hand column: the charter and its price. */
  aside?: ReactNode;
  children: ReactNode;
}

/** Page frame for every checkout step: heading, then content beside the summary. */
export function CheckoutPage({ heading, headingSerif, intro, aside, children }: CheckoutPageProps) {
  return (
    <div className="bg-white pb-[120px] antialiased" style={{ ...SANS, color: INK }}>
      <section className={`${FRAME} pt-[37px]`}>
        <h1 className="mt-[24px] text-[40px] leading-[1.1] font-normal tracking-[-1.5px] lg:text-[64px] lg:tracking-[-2px]">
          {heading} <span style={SERIF}>{headingSerif}</span>
        </h1>
        {intro && (
          <p className="mt-[20px] max-w-[640px] text-[16px] leading-[26px]" style={{ color: BODY }}>
            {intro}
          </p>
        )}
      </section>
      <section
        className={cx(
          FRAME,
          "mt-[48px] grid gap-[56px]",
          Boolean(aside) && "xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)] xl:gap-[80px]",
        )}
      >
        <div className="min-w-0">{children}</div>
        {aside && <aside className="min-w-0">{aside}</aside>}
      </section>
    </div>
  );
}

export interface SummaryRow {
  label: string;
  value: string;
  /** Larger type, for the final total. */
  strong?: boolean;
}

/** `dark` is for the navy booking card. */
export function SummaryRows({ rows, dark = false }: { rows: SummaryRow[]; dark?: boolean }) {
  const line = dark ? "border-white/15" : "border-[#e5e7eb]";
  return (
    <dl className={cx("mt-[16px] border-t", line)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className={cx(
            "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-[12px]",
            line,
            row.strong ? "text-[20px] leading-[28px]" : "text-[15px] leading-[22px]",
          )}
        >
          <dt
            className={cx("min-w-0", dark && !row.strong && "text-white/70")}
            style={dark ? undefined : { color: row.strong ? INK : BODY }}
          >
            {row.label}
          </dt>
          <dd className="min-w-0 text-right">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface QuantityStepperProps {
  /** Named on the buttons, for screen readers. */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max?: number;
  disabled?: boolean;
  /** Add-ons are optional: minus goes from `min` to 0, plus from 0 to `min`. */
  optional?: boolean;
  /** For the navy booking card. */
  dark?: boolean;
}

/** − value + control for guests and add-ons. */
export function QuantityStepper({
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
  optional = false,
  dark = false,
}: QuantityStepperProps) {
  const lowest = optional ? 0 : min;
  const lower = () => onChange(optional && value <= min ? 0 : value - 1);
  const raise = () => onChange(optional && value === 0 ? min : value + 1);
  const stepClass = cx(
    "flex size-[44px] shrink-0 items-center justify-center border disabled:cursor-not-allowed disabled:opacity-40",
    dark ? "border-white/40" : "border-[#0d1b2a]",
  );

  return (
    <div className="flex items-center gap-[12px]">
      <button
        type="button"
        aria-label={`Fewer: ${label}`}
        disabled={disabled || value <= lowest}
        onClick={lower}
        className={stepClass}
      >
        <Minus aria-hidden="true" strokeWidth={1.5} className="size-4" />
      </button>
      <span aria-live="polite" className="min-w-[24px] text-center text-[16px]">
        {value}
      </span>
      <button
        type="button"
        aria-label={`More: ${label}`}
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={raise}
        className={stepClass}
      >
        <Plus aria-hidden="true" strokeWidth={1.5} className="size-4" />
      </button>
    </div>
  );
}
