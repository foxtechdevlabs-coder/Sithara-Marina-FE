import { useId, type ReactNode } from "react";

import { cx } from "@/lib/cx";

export interface InfoPanelProps {
  /** Small uppercase heading, e.g. "Your privacy". */
  title: string;
  children: ReactNode;
  className?: string;
}

/** Beige note panel used on the account pages (privacy, code expiry, saved journey). */
export function InfoPanel({ title, children, className }: InfoPanelProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cx(
        "bg-[#F5F1E8] px-5 py-5 lg:px-[calc(var(--rw)*20)] lg:py-[calc(var(--r)*20)]",
        className,
      )}
    >
      <h2
        id={headingId}
        className="text-[0.6875rem] leading-none font-normal tracking-[0.12em] text-[#3d434a] uppercase lg:text-[max(calc(var(--r)*11),10px)]"
      >
        {title}
      </h2>
      <p className="mt-3 text-[0.8125rem] leading-snug text-[#0d1b2a] lg:mt-[calc(var(--r)*17)] lg:text-[max(calc(var(--r)*13),12px)]">
        {children}
      </p>
    </section>
  );
}
