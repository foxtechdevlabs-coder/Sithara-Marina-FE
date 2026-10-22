import { cx } from "@/lib/cx";

export interface SpinnerProps {
  /** Accessible label announced to screen readers. */
  label?: string;
  className?: string;
}

/** Neutral loading indicator. Colour follows `currentColor`. */
export function Spinner({ label = "Loading", className }: SpinnerProps) {
  return (
    <span role="status" className={cx("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
