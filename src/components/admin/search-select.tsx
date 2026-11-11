"use client";

import { Check, ChevronDown, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useDebounced } from "@/features/admin/fleet/hooks/use-debounced";
import { cx } from "@/lib/cx";

import { BODY, MUTED } from "./admin-theme";
import { errorProps, input } from "./form-parts";

/* A searchable combo box for records loaded from the backend (yachts, partners, customers…). */

export interface SearchOption<T = unknown> {
  value: string;
  label: string;
  /** A second line, e.g. an email or the partner's name. */
  description?: string;
  disabled?: boolean;
  /** The record behind the option, handed back on select. */
  data?: T;
}

export interface SearchResult<T> {
  options: SearchOption<T>[];
  /** More records match than were returned: ask the user to narrow the search. */
  hasMore?: boolean;
}

/** An extra row under the results, e.g. "Add new customer". */
export interface SearchAction {
  label: ReactNode;
  onSelect: () => void;
}

export interface SearchSelectProps<T> {
  id: string;
  /** The selected value, or "" for none. */
  value: string;
  onChange: (value: string, option: SearchOption<T> | null) => void;
  /** Loads the options matching `search` (empty: the first page). Called debounced. */
  load: (search: string, signal: AbortSignal) => Promise<SearchResult<T>>;
  /** Changes when `load` would return different results (e.g. a filter in the loader). */
  loadKey?: string;
  /** Label of the selected value when it isn't among the loaded options (e.g. from a URL). */
  selectedLabel?: string;
  /** Looks up the selected value's label when it isn't known yet. */
  resolve?: (value: string, signal: AbortSignal) => Promise<SearchOption<T> | null>;
  placeholder?: string;
  /** Shows a clear button; clearing sets "". Use for optional fields and filters. */
  clearable?: boolean;
  /** What "" means in a filter, e.g. "All yachts". Shown when nothing is selected. */
  emptyLabel?: string;
  disabled?: boolean;
  /** Message id of a `FieldError` for this field. */
  invalid?: string;
  /** Text when nothing matches. */
  noResults?: string;
  actions?: SearchAction[];
  /** Fired when the search text changes (e.g. to prefill a "new" form). */
  onSearchChange?: (search: string) => void;
}

const LIST_MAX = 280;

export function SearchSelect<T>({
  id,
  value,
  onChange,
  load,
  loadKey = "",
  selectedLabel,
  resolve,
  placeholder = "Search…",
  clearable,
  emptyLabel,
  disabled,
  invalid,
  noResults = "No matches.",
  actions = [],
  onSearchChange,
}: SearchSelectProps<T>) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const [known, setKnown] = useState<SearchOption<T> | null>(null);
  const [result, setResult] = useState<SearchResult<T> | null>(null);
  /** Which request the shown results (or error) answer; loading until it matches the current one. */
  const [settled, setSettled] = useState<{ key: string; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [place, setPlace] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const search = useDebounced(text.trim(), 250);
  const requestKey = `${search}|${loadKey}|${attempt}`;
  const loading = open && settled?.key !== requestKey;
  const error = !loading && Boolean(settled?.error);

  // The label of the current value.
  const label = value === "" ? "" : known?.value === value ? known.label : (selectedLabel ?? "");

  // Look up an unknown selected value's label once.
  useEffect(() => {
    if (!value || known?.value === value || selectedLabel || !resolve) return;
    const controller = new AbortController();
    resolve(value, controller.signal)
      .then((option) => {
        if (option) setKnown(option);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [value, known, selectedLabel, resolve]);

  // Load the options while open.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const key = requestKey;
    load(search, controller.signal)
      .then((r) => {
        setResult(r);
        setActive(0);
        setSettled({ key, error: false });
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError" || controller.signal.aborted) return;
        setSettled({ key, error: true });
      });
    return () => controller.abort();
    // `load` is usually an inline function; `loadKey` says when it really changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search, loadKey, attempt]);

  // Place the list under the field, or above it when there's no room, clamped to the screen.
  const position = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const up = below < Math.min(LIST_MAX, 200) && above > below;
    const width = Math.min(Math.max(r.width, 220), window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    setPlace(
      up
        ? {
            left,
            width,
            bottom: window.innerHeight - r.top + 4,
            maxHeight: Math.min(LIST_MAX, above),
          }
        : { left, width, top: r.bottom + 4, maxHeight: Math.min(LIST_MAX, below) },
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, position]);

  // Close on a click outside the field and the list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (inputRef.current?.parentElement?.contains(t) || listRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  });

  // Keep the active row in view.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const options = result?.options ?? [];
  const rows = [
    ...options.map((o) => ({ kind: "option" as const, option: o })),
    ...actions.map((a) => ({ kind: "action" as const, action: a })),
  ];

  function openList() {
    if (disabled || open) return;
    setText("");
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setText("");
  }
  function choose(index: number) {
    const row = rows[index];
    if (!row) return;
    if (row.kind === "action") {
      close();
      row.action.onSelect();
      return;
    }
    if (row.option.disabled) return;
    setKnown(row.option);
    onChange(row.option.value, row.option);
    close();
  }
  function clear() {
    setKnown(null);
    onChange("", null);
    close();
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.min(rows.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActive(Math.max(0, rows.length - 1));
        }
        break;
      case "Enter":
        if (open) {
          e.preventDefault();
          choose(active);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      case "Tab":
        close();
        break;
    }
  }

  const shown = open ? text : label;
  const activeId = open && rows[active] ? `${listId}-${active}` : undefined;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        disabled={disabled}
        value={shown}
        title={label || undefined}
        placeholder={open ? label || placeholder : (emptyLabel ?? placeholder)}
        onChange={(e) => {
          setText(e.currentTarget.value);
          onSearchChange?.(e.currentTarget.value);
          if (!open) setOpen(true);
        }}
        onFocus={openList}
        onClick={openList}
        onKeyDown={onKeyDown}
        className={cx(
          input,
          "cursor-text truncate pr-[64px]",
          !open && !label && emptyLabel && "placeholder:text-[#0d1b2a]!",
        )}
        {...errorProps(id, invalid)}
      />
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-[2px] pr-[12px]">
        {clearable && value && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={clear}
            className="pointer-events-auto flex size-[26px] items-center justify-center rounded-full hover:bg-[#f2f1ee]"
          >
            <X aria-hidden="true" className="size-[14px]" style={{ color: BODY }} />
          </button>
        )}
        <ChevronDown
          aria-hidden="true"
          className={cx("size-[16px] transition-transform", open && "rotate-180")}
        />
      </span>

      {open &&
        place &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Options"
            style={{
              position: "fixed",
              left: place.left,
              width: place.width,
              top: place.top,
              bottom: place.bottom,
              maxHeight: place.maxHeight,
            }}
            className="z-[1000] overflow-y-auto border border-[#dcdad5] bg-white text-[13px] shadow-[0_8px_24px_rgba(13,27,42,0.12)]"
          >
            {loading && !result && (
              <li className="px-[16px] py-[12px]" style={{ color: MUTED }}>
                Searching…
              </li>
            )}
            {error && !loading && (
              <li className="px-[16px] py-[12px] text-[#9b2c2c]">
                Couldn’t load the list.{" "}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setAttempt((a) => a + 1)}
                  className="underline"
                >
                  Try again
                </button>
              </li>
            )}
            {result &&
              !error &&
              options.map((o, i) => {
                const selected = o.value === value;
                return (
                  <li
                    key={o.value}
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={o.disabled || undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseMove={() => setActive(i)}
                    onClick={() => choose(i)}
                    className={cx(
                      "flex cursor-pointer items-start gap-[8px] px-[16px] py-[10px]",
                      i === active && "bg-[#f5f3ee]",
                      o.disabled && "cursor-not-allowed opacity-50",
                      loading && "opacity-60",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words">{o.label}</span>
                      {o.description && (
                        <span className="block text-[11px] break-words" style={{ color: BODY }}>
                          {o.description}
                        </span>
                      )}
                    </span>
                    {selected && (
                      <Check aria-hidden="true" className="mt-[3px] size-[14px] shrink-0" />
                    )}
                  </li>
                );
              })}
            {result && !error && !loading && options.length === 0 && (
              <li className="px-[16px] py-[10px]" style={{ color: MUTED }}>
                {noResults}
              </li>
            )}
            {result?.hasMore && !error && (
              <li className="px-[16px] py-[8px] text-[11px]" style={{ color: MUTED }}>
                Showing the first {options.length}. Type to narrow the search.
              </li>
            )}
            {actions.map((a, j) => {
              const i = options.length + j;
              return (
                <li
                  key={j}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={cx(
                    "flex cursor-pointer items-center gap-[6px] border-t border-[#eceae6] px-[16px] py-[12px]",
                    i === active && "bg-[#f5f3ee]",
                  )}
                >
                  {a.label}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
