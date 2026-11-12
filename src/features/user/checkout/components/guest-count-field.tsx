"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { cx } from "@/lib/cx";

interface GuestCountFieldProps {
  value: number;
  min: number;
  /** The yacht's capacity, when known. */
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** For the navy booking card. */
  dark?: boolean;
  /** Marks the number invalid, e.g. above the yacht's capacity. */
  invalid?: boolean;
  /** Id of the message that explains the count (hint or error). */
  describedBy?: string;
}

const stepBase =
  "flex size-[44px] shrink-0 items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40";

/**
 * − [number] + for the guest count. All three share one value. Typing accepts
 * whole numbers only; a blank or too-small entry returns to the last valid
 * count when the field is left. A count above `max` is passed on, so the page
 * can say why it cannot be used.
 */
export function GuestCountField({
  value,
  min,
  max,
  onChange,
  disabled = false,
  dark = false,
  invalid = false,
  describedBy,
}: GuestCountFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const stepClass = cx(
    stepBase,
    dark ? "border-white/40 enabled:hover:bg-white/10" : "border-[#0d1b2a]",
  );
  return (
    <div className="flex items-center gap-[10px]">
      <button
        type="button"
        aria-label="Fewer guests"
        disabled={disabled || value <= min}
        // From above the capacity, one press comes straight back to the largest valid count.
        onClick={() => onChange(max !== undefined && value > max ? max : value - 1)}
        className={stepClass}
      >
        <Minus aria-hidden="true" strokeWidth={1.5} className="size-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label="Number of guests"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(event) => {
          const digits = event.currentTarget.value.replace(/\D/g, "").slice(0, 3);
          setDraft(digits);
          if (digits !== "" && Number(digits) >= min) onChange(Number(digits));
        }}
        onBlur={() => setDraft(null)}
        className={cx(
          "h-[44px] w-[56px] border bg-white text-center text-[16px] text-[#0d1b2a] outline-none disabled:opacity-50",
          invalid
            ? "border-[#b42318] focus:border-[#b42318]"
            : dark
              ? "border-white/40 focus:border-white"
              : "border-[#c9ccd0] focus:border-[#0d1b2a]",
        )}
      />
      <button
        type="button"
        aria-label="More guests"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => onChange(value + 1)}
        className={stepClass}
      >
        <Plus aria-hidden="true" strokeWidth={1.5} className="size-4" />
      </button>
    </div>
  );
}
