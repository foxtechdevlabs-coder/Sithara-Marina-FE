"use client";

import { ChevronDown, X } from "lucide-react";
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { cx } from "@/lib/cx";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface SearchComboboxProps {
  /** Id of the input, for the field's `<label htmlFor>`. */
  id: string;
  /** The applied value ("" = any). */
  value: string;
  /** Called with the new value once it is chosen, entered, or cleared. */
  onCommit: (value: string) => void;
  /** Suggestions, e.g. from GET /yachts/filters. */
  options: ComboboxOption[];
  /** Shown while empty, e.g. "Any region". */
  placeholder: string;
  /**
   * Turns typed text into a value the backend accepts, or null when it accepts
   * none. Without it only a suggestion (matched ignoring case) can be applied.
   */
  parseCustom?: (text: string) => string | null;
  /** Characters kept while typing, e.g. digits only for a count. */
  sanitize?: (text: string) => string;
  inputMode?: "text" | "numeric";
  /** Text in the list when nothing matches. */
  emptyText: string;
  disabled?: boolean;
  /** A value that is already the default (e.g. "recommended"): no clear button for it. */
  defaultValue?: string;
  /** The field box look (border, height, type) of the page it sits on. */
  className?: string;
  style?: CSSProperties;
}

const norm = (text: string) => text.trim().toLocaleLowerCase();

/**
 * A field you can type into, with matching suggestions below it (WAI-ARIA
 * combobox with a listbox). Arrow keys move through the list, Enter applies,
 * Escape closes and then restores the applied value; the × clears it. Typing
 * only narrows the suggestions: nothing is applied, and nothing is sent, until a
 * value is chosen or entered. Works with touch: suggestions are tap targets.
 */
export function SearchCombobox({
  id,
  value,
  onCommit,
  options,
  placeholder,
  parseCustom,
  sanitize,
  inputMode = "text",
  emptyText,
  disabled = false,
  defaultValue = "",
  className,
  style,
}: SearchComboboxProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const appliedLabel = options.find((option) => option.value === value)?.label ?? value;
  /** What is typed, while editing; null shows the applied value. */
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  /** The highlight was moved with the arrow keys or pointer (not just the first match). */
  const navigated = useRef(false);

  const text = draft ?? appliedLabel;
  const query = draft === null ? "" : norm(draft);
  const matches = query
    ? // On the visible text only: values can be internal (e.g. a price range in paise).
      options.filter((option) => norm(option.label).includes(query))
    : options;

  const close = () => {
    setOpen(false);
    setActive(-1);
    navigated.current = false;
  };
  /** Typed text that applies as it is: an exact suggestion or a valid custom value. */
  const typedApplies = () => {
    const typed = draft?.trim();
    if (!typed) return false;
    return (
      options.some((option) => norm(option.label) === norm(typed) || norm(option.value) === norm(typed)) ||
      (parseCustom?.(typed) ?? null) !== null
    );
  };
  const apply = (next: string) => {
    setDraft(null);
    close();
    if (next !== value) onCommit(next);
  };
  /**
   * Applies what was typed: a suggestion it names, a valid custom value, or "" when
   * blank. With `single` (Enter), a partial text with exactly one match applies it.
   */
  const applyTyped = (single = false) => {
    if (draft === null) return close();
    const typed = draft.trim();
    if (!typed) return apply("");
    const exact = options.find(
      (option) => norm(option.label) === norm(typed) || norm(option.value) === norm(typed),
    );
    if (exact) return apply(exact.value);
    const custom = parseCustom?.(typed) ?? null;
    if (custom !== null) return apply(custom);
    const only = matches.length === 1 ? matches[0] : undefined;
    if (single && only) return apply(only.value);
    // Not something the search can use: back to the applied value.
    setDraft(null);
    close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) setOpen(true);
      if (matches.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      navigated.current = true;
      setActive((current) => (current + step + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      event.preventDefault(); // never submits the surrounding form half-typed
      // A highlighted suggestion applies, unless the text typed is itself a value
      // and the highlight is only the automatic first match.
      const chosen = open && active >= 0 ? matches[active] : undefined;
      if (chosen && (navigated.current || !typedApplies())) apply(chosen.value);
      else applyTyped(true);
    } else if (event.key === "Escape") {
      if (open) close();
      else setDraft(null);
    } else if (event.key === "Home" || event.key === "End") {
      if (open && matches.length) {
        event.preventDefault();
        setActive(event.key === "Home" ? 0 : matches.length - 1);
      }
    }
  };

  const activeId = open && active >= 0 && active < matches.length ? `${listId}-${active}` : undefined;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        inputMode={inputMode}
        enterKeyHint="search"
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        onFocus={(event) => {
          event.currentTarget.select();
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          const typed = sanitize ? sanitize(event.currentTarget.value) : event.currentTarget.value;
          setDraft(typed);
          setOpen(true);
          // The first match is highlighted, so Enter applies it.
          navigated.current = false;
          setActive(typed.trim() ? 0 : -1);
        }}
        onBlur={() => applyTyped()}
        onKeyDown={onKeyDown}
        className={cx(className, "pr-[72px] placeholder:text-[#7a7f85]")}
        style={style}
      />

      {text && !disabled && !(draft === null && value === defaultValue) ? (
        <button
          type="button"
          aria-label="Clear"
          // Keeps focus in the field, so the blur does not apply the old text first.
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            apply(defaultValue);
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-[40px] flex size-[28px] -translate-y-1/2 items-center justify-center text-[#9aa0a6] transition-colors hover:text-[#0d1b2a] focus-visible:outline-2 focus-visible:outline-[#0d1b2a]"
        >
          <X aria-hidden="true" strokeWidth={1.5} className="size-4" />
        </button>
      ) : null}
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.5}
        className={cx(
          "pointer-events-none absolute top-1/2 right-[16px] size-4 -translate-y-1/2 text-[#9aa0a6] transition-transform",
          open && "rotate-180",
        )}
      />

      <ul
        id={listId}
        role="listbox"
        hidden={!open}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-[264px] overflow-y-auto border border-[#c9ccd0] bg-white py-2 shadow-[0_12px_32px_rgba(6,26,43,0.12)]"
      >
        {matches.length === 0 ? (
          <li role="presentation" className="px-[16px] py-[10px] text-[15px] text-[#7a7f85]">
            {emptyText}
          </li>
        ) : (
          matches.map((option, index) => {
            const selected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                // Chosen before the input blurs, so the tap or click is not lost.
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => apply(option.value)}
                onPointerMove={() => {
                  navigated.current = true;
                  setActive(index);
                }}
                className={cx(
                  "flex min-h-[44px] cursor-pointer items-center px-[16px] text-[15px] text-[#0d1b2a]",
                  index === active && "bg-[#f6f8fb]",
                  selected && "font-medium",
                )}
              >
                {option.label}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
