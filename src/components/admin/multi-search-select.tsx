"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import { BODY } from "./admin-theme";
import { SearchSelect, type SearchOption, type SearchResult } from "./search-select";

/**
 * Several records from the backend: a searchable field to add one at a time,
 * and the chosen ones as removable chips. Chosen records show as unavailable
 * in the results.
 */
export function MultiSearchSelect<T>({
  id,
  values,
  onChange,
  load,
  max,
  placeholder,
  noResults,
  invalid,
  disabled,
  extra,
}: {
  id: string;
  values: SearchOption<T>[];
  onChange: (values: SearchOption<T>[]) => void;
  load: (search: string, signal: AbortSignal) => Promise<SearchResult<T>>;
  /** Most that can be chosen. */
  max?: number;
  placeholder?: string;
  noResults?: string;
  /** Message id of a `FieldError` for this field. */
  invalid?: string;
  disabled?: boolean;
  /** Controls beside the count, e.g. "Add all active yachts". */
  extra?: ReactNode;
}) {
  const chosen = new Set(values.map((v) => v.value));
  const full = max !== undefined && values.length >= max;

  return (
    <div>
      <SearchSelect<T>
        id={id}
        value=""
        onChange={(_, option) => {
          if (option && !chosen.has(option.value) && !full) onChange([...values, option]);
        }}
        load={async (search, signal) => {
          const result = await load(search, signal);
          return {
            ...result,
            options: result.options.map((o) =>
              chosen.has(o.value)
                ? { ...o, disabled: true, description: "Already added" }
                : full
                  ? { ...o, disabled: true }
                  : o,
            ),
          };
        }}
        loadKey={`${values.length}`}
        placeholder={full ? `Up to ${max} — remove one to add another` : placeholder}
        noResults={noResults}
        invalid={invalid}
        disabled={disabled || full}
      />
      <div className="mt-[8px] flex flex-wrap items-center justify-between gap-[8px]">
        <p className="text-[11px]" style={{ color: BODY }} aria-live="polite">
          {values.length ? `${values.length} chosen` : "None chosen yet"}
          {max !== undefined && ` · up to ${max}`}
        </p>
        <div className="flex flex-wrap gap-[12px]">
          {extra}
          {values.length > 0 && !disabled && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] underline underline-offset-2"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
      {values.length > 0 && (
        <ul
          aria-label="Chosen"
          className="mt-[8px] flex max-h-[180px] flex-wrap gap-[6px] overflow-y-auto"
        >
          {values.map((v) => (
            <li
              key={v.value}
              className="flex max-w-full items-center gap-[4px] border border-[#dcdad5] bg-white py-[3px] pr-[4px] pl-[10px] text-[12px]"
            >
              <span className="min-w-0 truncate" title={v.label}>
                {v.label}
              </span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${v.label}`}
                  onClick={() => onChange(values.filter((x) => x.value !== v.value))}
                  className="flex size-[22px] shrink-0 items-center justify-center rounded-full hover:bg-[#f2f1ee]"
                >
                  <X aria-hidden="true" className="size-[12px]" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
