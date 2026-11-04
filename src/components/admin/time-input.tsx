"use client";

import { cx } from "@/lib/cx";
import { clampTime, fromParts, toParts, type Period, type TimeParts } from "@/lib/time";

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 15, 30, 45];
const PERIODS: Period[] = ["AM", "PM"];

const pad = (n: number) => String(n).padStart(2, "0");
const part =
  "h-[36px] min-w-0 flex-1 cursor-pointer appearance-none bg-[#f5f3ee] text-center text-[14px] text-[#0d1b2a] outline-none transition-colors [text-align-last:center] hover:bg-[#ebe8e1] focus-visible:outline-2 focus-visible:outline-[#0d1b2a]";

/**
 * A time field in 12-hour format: dropdowns for the hour, minutes and AM/PM,
 * side by side. Browsers pick the format of a native time input from the
 * device's locale, so it can't promise AM/PM. `value` stays "HH:mm", and the
 * hour dropdown carries `id`, so a label opens straight onto it.
 */
export function TimeInput({
  id,
  label,
  value,
  onChange,
  min,
  max,
  error,
}: {
  id: string;
  /** Names the dropdowns for screen readers. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
}) {
  const parts = toParts(value || min || "09:00");
  const inWindow = (candidate: TimeParts) => {
    const time = fromParts(candidate);
    return clampTime(time, min, max) === time;
  };
  // A saved time can use a minute that isn't one of the quarter hours.
  const minutes = MINUTES.includes(parts.minute)
    ? MINUTES
    : [...MINUTES, parts.minute].sort((a, b) => a - b);
  const hourAllowed = (hour: number, period = parts.period) =>
    minutes.some((minute) => inWindow({ hour, minute, period }));

  /** Changing one part can leave the window, so the result is brought back into it. */
  const choose = (change: Partial<TimeParts>) =>
    onChange(clampTime(fromParts({ ...parts, ...change }), min, max));

  return (
    <div
      className={cx(
        "flex h-[52px] w-full items-center gap-[4px] border bg-white px-[7px]",
        error ? "border-[#b3261e]" : "border-[#dcdad5]",
      )}
    >
      <select
        id={id}
        aria-label={`${label}: hour`}
        aria-describedby={error ? `${id}-error` : undefined}
        data-value={value}
        className={part}
        value={value ? parts.hour : ""}
        onChange={(e) => choose({ hour: Number(e.currentTarget.value) })}
      >
        {!value && <option value="">--</option>}
        {HOURS.map((hour) => (
          <option key={hour} value={hour} disabled={!hourAllowed(hour) && hour !== parts.hour}>
            {hour}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="text-[14px]">
        :
      </span>
      <select
        id={`${id}-minutes`}
        aria-label={`${label}: minutes`}
        className={part}
        value={parts.minute}
        onChange={(e) => choose({ minute: Number(e.currentTarget.value) })}
      >
        {minutes.map((minute) => (
          <option
            key={minute}
            value={minute}
            disabled={!inWindow({ ...parts, minute }) && minute !== parts.minute}
          >
            {pad(minute)}
          </option>
        ))}
      </select>
      <select
        id={`${id}-period`}
        aria-label={`${label}: AM or PM`}
        className={part}
        value={parts.period}
        onChange={(e) => choose({ period: e.currentTarget.value as Period })}
      >
        {PERIODS.map((period) => (
          <option
            key={period}
            value={period}
            disabled={!HOURS.some((hour) => hourAllowed(hour, period)) && period !== parts.period}
          >
            {period}
          </option>
        ))}
      </select>
    </div>
  );
}
