"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

interface GuestCountFieldProps {
  value: number;
  min: number;
  /** The yacht's capacity, when known. */
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const stepClass =
  "flex size-[44px] shrink-0 items-center justify-center border border-[#0d1b2a] disabled:cursor-not-allowed disabled:opacity-40";

/**
 * − [number] + for the guest count. All three share one value. Typing accepts
 * whole numbers only; a blank or too-small entry returns to the last valid
 * count when the field is left. A count above `max` is passed on, so the page
 * can say why it cannot be used.
 */
export function GuestCountField({ value, min, max, onChange, disabled = false }: GuestCountFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-[10px]">
      <button
        type="button"
        aria-label="Fewer guests"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
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
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(event) => {
          const digits = event.currentTarget.value.replace(/\D/g, "").slice(0, 3);
          setDraft(digits);
          if (digits !== "" && Number(digits) >= min) onChange(Number(digits));
        }}
        onBlur={() => setDraft(null)}
        className="h-[44px] w-[56px] border border-[#c9ccd0] bg-white text-center text-[16px] text-[#0d1b2a] outline-none focus:border-[#0d1b2a] disabled:opacity-50"
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
