"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import { userRoutes } from "@/constants/routes";
import { useAuthSession } from "@/features/user/auth/session";
import {
  CheckoutPage,
  Loading,
  Notice,
  primaryButtonClass,
  primaryButtonStyle,
} from "@/features/user/checkout/components/checkout-ui";
import { cx } from "@/lib/cx";

/*
 * The signed-in customer's pages: a sign-in guard, the page frame with its
 * section tabs, status pills and backend-driven pagination. Same Figma look as
 * checkout (checkout-ui).
 */

const noop = () => () => {};
/** False during the server render and hydration, true once the browser can read storage. */
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/** Shows its children only to a signed-in customer; otherwise offers sign-in. */
export function RequireCustomer({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const session = useAuthSession();
  const pathname = usePathname();

  if (!hydrated) {
    return (
      <CheckoutPage heading="Your" headingSerif="account">
        <Loading label="Loading your account" />
      </CheckoutPage>
    );
  }
  if (!session) {
    return (
      <CheckoutPage heading="Your" headingSerif="account">
        <Notice>Please sign in to see your enquiries, proposals and cancellation requests.</Notice>
        <Link
          href={`${userRoutes.login}?next=${encodeURIComponent(pathname)}` as Route}
          className={`${primaryButtonClass} mt-[24px]`}
          style={primaryButtonStyle}
        >
          Sign in
        </Link>
      </CheckoutPage>
    );
  }
  return children;
}

const TABS: { label: string; href: Route }[] = [
  { label: "Enquiries", href: userRoutes.accountEnquiries },
  { label: "Cancellation requests", href: userRoutes.accountCancellations },
];

interface AccountPageProps {
  heading: string;
  headingSerif: string;
  intro?: ReactNode;
  children: ReactNode;
}

export function AccountPage({ heading, headingSerif, intro, children }: AccountPageProps) {
  const pathname = usePathname();
  return (
    <CheckoutPage heading={heading} headingSerif={headingSerif} intro={intro}>
      <nav aria-label="Your account" className="-mt-[16px] mb-[40px] border-b border-[#e3e5e8]">
        <ul className="flex flex-wrap gap-x-[32px]">
          {TABS.map((tab) => {
            const current = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={current ? "page" : undefined}
                  className={cx(
                    "-mb-px inline-block border-b-2 py-[12px] text-[12px] tracking-[0.18em] uppercase transition-colors",
                    current
                      ? "border-[#0d1b2a] text-[#0d1b2a]"
                      : "border-transparent text-[#7a7f85] hover:text-[#0d1b2a]",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </CheckoutPage>
  );
}

export type Tone = "waiting" | "positive" | "negative" | "neutral";

/** A small status label. The text always says the status: colour only supports it. */
export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-[8px] px-[10px] py-[5px] text-[11px] leading-[14px] tracking-[0.14em] whitespace-nowrap uppercase",
        tone === "waiting" && "bg-[#f3efe6] text-[#5b5244]",
        tone === "positive" && "bg-[#0d1b2a] text-white",
        tone === "negative" && "bg-[#fbeceb] text-[#912018]",
        tone === "neutral" && "bg-[#eef0f2] text-[#4a4f55]",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "size-[6px] rounded-full",
          tone === "waiting" && "bg-[#a08a5c]",
          tone === "positive" && "bg-white",
          tone === "negative" && "bg-[#b42318]",
          tone === "neutral" && "bg-[#9aa0a6]",
        )}
      />
      {children}
    </span>
  );
}

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
  disabled?: boolean;
}

/** Previous / next over the backend's pages. Hidden when everything fits on one. */
export function Pagination({ page, limit, total, onPage, disabled = false }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  const step =
    "inline-flex size-[44px] items-center justify-center border border-[#0d1b2a] transition-colors enabled:hover:bg-[#0d1b2a] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <nav aria-label="Pages" className="mt-[32px] flex items-center gap-[16px]">
      <button
        type="button"
        aria-label="Previous page"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
        className={step}
      >
        <ArrowLeft aria-hidden="true" strokeWidth={1.5} className="size-4" />
      </button>
      <p className="text-[14px] tabular-nums text-[#4a4f55]" aria-live="polite">
        Page {page} of {pages}
      </p>
      <button
        type="button"
        aria-label="Next page"
        disabled={disabled || page >= pages}
        onClick={() => onPage(page + 1)}
        className={step}
      >
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
      </button>
    </nav>
  );
}

/** Label / value pairs in the site's small-caps style. */
export function DetailGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-[28px] border-t border-[#eef0f2] sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 border-b border-[#eef0f2] py-[12px]">
          <dt className="text-[11px] tracking-[0.16em] text-[#7a7f85] uppercase">{item.label}</dt>
          <dd className="mt-[4px] text-[15px] leading-[22px] break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
