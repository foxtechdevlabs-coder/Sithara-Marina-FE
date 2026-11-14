import type { CSSProperties, ReactNode } from "react";

import { SERIF } from "@/components/user/marina-chrome";
import { PRIMARY_GRADIENT } from "@/features/user/auth/components/auth-form-styles";
import { cx } from "@/lib/cx";

/*
 * Building blocks of the account pages (Figma C17–C66): heading, cards, status
 * chips, pearl notices, buttons and form fields. Server-compatible: no hooks.
 */

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy-ink";

const buttonBase = cx(
  "inline-flex min-h-[55px] min-w-[11rem] items-center justify-center gap-2 px-6 text-center text-[13px] leading-tight disabled:cursor-wait disabled:opacity-60",
  focusRing,
);

/** Light-to-blue gradient call to action; pair with `style={primaryButtonStyle}`. */
export const primaryButtonClass = cx(
  buttonBase,
  "text-navy-ink transition-opacity hover:opacity-90",
);
export const primaryButtonStyle: CSSProperties = { background: PRIMARY_GRADIENT };

/** White button with a thin navy border. */
export const secondaryButtonClass = cx(
  buttonBase,
  "border border-navy-ink bg-white text-navy-ink transition-colors hover:bg-navy-ink hover:text-white",
);

/** Solid navy button (the cancellation flow). */
export const darkButtonClass = cx(
  buttonBase,
  "bg-brand-950 text-white transition-colors hover:bg-brand-900",
);

/** Borderless text action ("Plan another charter", "Return to the website"). */
export const textButtonClass = cx(
  "inline-flex min-h-11 items-center px-6 text-[12px] text-navy-ink underline-offset-4 hover:underline",
  focusRing,
);

export const buttonRowClass = "flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap";

export const inputClass =
  "h-[55px] w-full border border-rule bg-white px-4 text-[15px] text-navy-ink outline-none placeholder:text-navy-ink/60 focus:border-navy-ink aria-[invalid=true]:border-[#b42318] read-only:bg-[#fafafa]";
export const labelClass = "mb-2.5 block text-[11px] leading-none text-body";
export const fieldErrorClass = "mt-2 text-[13px] leading-snug text-[#b42318]";

export interface AccountHeadingProps {
  /** Sans-serif part of the heading. */
  heading: string;
  /** Serif part that ends the heading, e.g. "thoughtfully arranged.". */
  headingSerif?: string;
  subtitle?: ReactNode;
  /** Small uppercase line under the subtitle (e.g. "Invoice SM-INV-1048"). */
  eyebrow?: string;
}

/** Breadcrumb, mixed sans/serif `<h1>` and subtitle at the top of every account page. */
export function AccountHeading({ heading, headingSerif, subtitle, eyebrow }: AccountHeadingProps) {
  return (
    <header>
      <p className="text-[11px] leading-none tracking-[0.12em] text-body uppercase">
        Sithara Marina / Account
      </p>
      <h1 className="mt-7 text-[2.375rem] leading-[1.05] font-normal tracking-[-0.03em] text-navy-ink sm:text-[3.25rem] lg:mt-10 lg:text-[4.5rem] lg:leading-none">
        {heading}
        {headingSerif ? (
          <>
            {" "}
            <span className="tracking-[-0.01em]" style={SERIF}>
              {headingSerif}
            </span>
          </>
        ) : null}
      </h1>
      {subtitle ? (
        <p className="mt-6 text-[15px] leading-snug text-body lg:mt-8 lg:text-[18px]">{subtitle}</p>
      ) : null}
      {eyebrow ? (
        <p className="mt-6 text-[11px] leading-none tracking-[0.14em] text-body uppercase">
          {eyebrow}
        </p>
      ) : null}
    </header>
  );
}

/** Thin-bordered panel. `title` renders as an `<h2>` at the card's top. */
export function Card({
  title,
  children,
  className,
  as: Tag = "section",
}: {
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  return (
    <Tag className={cx("border border-rule bg-white p-5 sm:p-7", className)}>
      {title ? <CardTitle>{title}</CardTitle> : null}
      {children}
    </Tag>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cx(
        "text-[1.375rem] leading-snug font-normal tracking-[-0.01em] text-navy-ink lg:text-[1.5rem]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Small grey lines under a card title. */
export function MetaLines({ lines, className }: { lines: ReactNode[]; className?: string }) {
  return (
    <div className={cx("mt-3 space-y-1 text-[13px] leading-[1.45] text-body", className)}>
      {lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );
}

/** "Confirmed · Paid": solid forest; `pearl` for in-progress states ("Refund processing"). */
export function StatusChip({
  children,
  tone = "forest",
  className,
}: {
  children: ReactNode;
  tone?: "forest" | "pearl";
  className?: string;
}) {
  return (
    <p
      className={cx(
        "flex min-h-[30px] w-full max-w-[13.5rem] items-center px-2.5 text-[11px] leading-tight",
        tone === "forest" ? "bg-forest text-white" : "bg-pearl text-navy-ink",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Pearl band with a small uppercase label ("A proposal ready for you"). */
export function AccountNotice({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cx("bg-pearl px-5 py-4 text-navy-ink sm:px-5 sm:py-5", className)}>
      <p className="text-[10px] leading-none tracking-[0.14em] text-body uppercase">{label}</p>
      <p className="mt-3 text-[13px] leading-[1.55]">{children}</p>
    </aside>
  );
}

/** Label/value pairs: stacked on phones, two columns from `sm`. */
export function DetailRows({
  rows,
  className,
  compact = false,
}: {
  rows: readonly { label: string; value: ReactNode }[];
  className?: string;
  /** Tighter rows, e.g. inside a small card. */
  compact?: boolean;
}) {
  return (
    <dl
      className={cx(
        "text-[13px] leading-snug",
        compact ? "space-y-3" : "space-y-5 sm:space-y-6",
        className,
      )}
    >
      {rows.map(({ label, value }) => (
        <div key={label} className="grid gap-1.5 sm:grid-cols-2 sm:gap-6">
          <dt className="text-[12px] text-body">{label}</dt>
          <dd className="text-navy-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Horizontal rule between page sections. */
export function SectionRule({ className }: { className?: string }) {
  return <hr className={cx("border-rule", className)} />;
}

/** "01 / Request received" steps, each with one line of detail, between thin rules. */
export function StepList({
  steps,
  className,
}: {
  steps: readonly { label: string; detail: ReactNode }[];
  className?: string;
}) {
  return (
    <ol className={cx("divide-y divide-rule", className)}>
      {steps.map((step, index) => (
        <li key={step.label} className="py-5 first:pt-0 last:pb-0 sm:py-6">
          <p className="text-[11px] leading-none tracking-[0.06em] text-body">
            {String(index + 1).padStart(2, "0")} / {step.label}
          </p>
          <p className="mt-2.5 text-[13px] leading-snug text-navy-ink">{step.detail}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * Body of the confirmation pages ("Your details, up to date."): status chip,
 * a bordered card with what it means, then the next actions.
 */
export function ConfirmationPanel({
  status,
  statusTone = "forest",
  title,
  children,
  actions,
}: {
  status: string;
  statusTone?: "forest" | "pearl";
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <>
      <StatusChip tone={statusTone} className="mt-7 lg:mt-8">
        {status}
      </StatusChip>
      <Card title={title} className="mt-6">
        <div className="mt-3 text-[13px] leading-[1.55] text-body">{children}</div>
      </Card>
      <div className={cx(buttonRowClass, "mt-7")}>{actions}</div>
    </>
  );
}
