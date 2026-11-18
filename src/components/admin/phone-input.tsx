"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cx } from "@/lib/cx";
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY,
  countryByIso,
  joinPhone,
  splitPhone,
} from "@/lib/country-codes";

import { errorProps, input } from "./form-parts";
import { phoneCharacters } from "@/lib/input-filters";

/**
 * A phone number with a country code picker. `value` and `onChange` use the
 * full international number ("+919876543210", or "" when empty), which is what
 * the API takes. The text field carries `id`, so its label focuses the number.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  error,
  placeholder = "98765 43210",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  const [iso, setIso] = useState(() => splitPhone(value)?.iso ?? DEFAULT_COUNTRY);
  const [national, setNational] = useState(() => splitPhone(value)?.national ?? value);
  const [shown, setShown] = useState(value);

  // A new number from outside, e.g. an existing customer picked: show it.
  if (value !== shown) {
    setShown(value);
    if (value !== joinPhone(iso, national)) {
      const split = splitPhone(value, iso);
      setIso(split?.iso ?? iso);
      setNational(split?.national ?? value);
    }
  }

  const emit = (nextIso: string, nextNational: string) => {
    const next = joinPhone(nextIso, nextNational);
    setShown(next);
    onChange(next);
  };

  const country = countryByIso(iso);

  return (
    <div className="flex gap-[8px]">
      <div className="group relative w-[112px] shrink-0">
        <span
          aria-hidden="true"
          className={cx(
            input,
            "pointer-events-none flex items-center justify-between pr-[12px] group-has-[select:focus-visible]:border-[#0d1b2a] group-has-[select:focus-visible]:outline-2 group-has-[select:focus-visible]:outline-offset-2 group-has-[select:focus-visible]:outline-[#0d1b2a]",
          )}
        >
          <span>
            {country.iso} +{country.dial}
          </span>
          <ChevronDown strokeWidth={1.75} className="size-4" />
        </span>
        <select
          id={`${id}-country`}
          aria-label="Country code"
          value={iso}
          onChange={(e) => {
            const next = e.currentTarget.value;
            setIso(next);
            emit(next, national);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.name} (+{c.dial})
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={national}
        placeholder={placeholder}
        maxLength={20}
        onChange={(e) => {
          const text = phoneCharacters(e.currentTarget.value);
          // A whole number pasted with its "+code" picks its own country.
          const pasted = text.trim().startsWith("+") ? splitPhone(text, iso) : null;
          const nextIso = pasted?.iso ?? iso;
          const nextNational = pasted?.national ?? text;
          setIso(nextIso);
          setNational(nextNational);
          emit(nextIso, nextNational);
        }}
        className={cx(input, "min-w-0 flex-1")}
        {...errorProps(id, error)}
      />
    </div>
  );
}
