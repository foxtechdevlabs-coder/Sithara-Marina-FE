import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export interface RoutePlaceholderProps {
  title: string;
  description?: ReactNode;
  className?: string;
}

/**
 * SCAFFOLDING ONLY. Marks a route that exists in the architecture but has not
 * been built yet. Replace each usage with the real feature UI, then delete
 * this component once no routes use it.
 */
export function RoutePlaceholder({ title, description, className }: RoutePlaceholderProps) {
  return (
    <section className={cx("mx-auto w-full max-w-3xl px-4 py-12", className)}>
      <p className="text-xs font-semibold tracking-wider uppercase opacity-60">
        Starter page — not yet implemented
      </p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h1>
      {description ? <div className="mt-3 opacity-80">{description}</div> : null}
    </section>
  );
}
