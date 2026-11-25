"use client";

import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  ClipboardCheck,
  ClipboardList,
  ClipboardX,
  CreditCard,
  FileText,
  Sailboat,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  createElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import { Spinner } from "@/components/ui/spinner";
import { userRoutes } from "@/constants/routes";
import { CardTitle } from "@/features/user/account/components/account-ui";
import { cx } from "@/lib/cx";
import type {
  CustomerNotification,
  CustomerNotificationType,
} from "@/services/user/notifications.service";

import type { NotificationInbox } from "../hooks/use-notification-inbox";
import {
  bellLabel,
  notificationFullTime,
  notificationHref,
  notificationTimeAgo,
  unreadBadge,
} from "../utils/notification-inbox";

export interface NotificationBellProps {
  /** From `useNotificationInbox`, held by the header so both placements share one inbox. */
  inbox: NotificationInbox;
  /** Called when the panel opens (the header closes its menu). */
  onOpen?: () => void;
  /** The header's focus ring for the trigger. */
  focusRingClass?: string;
}

/** Below Tailwind's `sm`: the panel is a full-screen sheet instead of a dropdown. */
const SHEET_QUERY = "(max-width: 639.98px)";

const itemFocus =
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-ink";
const smallActionClass = cx(
  "text-[12px] text-navy-ink underline underline-offset-4 hover:no-underline disabled:cursor-wait disabled:opacity-60",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-ink",
);

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** One icon per notification type; a type added on the backend later gets the bell. */
const TYPE_ICON: Record<CustomerNotificationType, LucideIcon> = {
  booking_confirmed: CalendarCheck,
  payment_failed: CreditCard,
  refund_initiated: Undo2,
  refund_processed: Undo2,
  booking_cancelled: CalendarX,
  cancellation_request_received: ClipboardList,
  cancellation_request_approved: ClipboardCheck,
  cancellation_request_rejected: ClipboardX,
  booking_rescheduled: CalendarClock,
  charter_reminder: Sailboat,
  proposal_sent: FileText,
};
const iconFor = (type: string): LucideIcon =>
  (TYPE_ICON as Record<string, LucideIcon | undefined>)[type] ?? Bell;

/**
 * Header bell for a signed-in customer (on the right beside "Book yachts"; on
 * phones beside Menu, where the right side has no room next to the logo):
 * unread badge, and a panel with the newest notifications. Opening one marks it read
 * and goes to its booking or proposal. Closes on a click outside,
 * Escape, or (phones) the Close button. Render it only while signed in:
 * unmounting it drops the customer's notifications.
 */
export function NotificationBell({ inbox, onOpen, focusRingClass }: NotificationBellProps) {
  /** Phones: a full-screen sheet (modal); otherwise a dropdown under the bell. */
  const [compact, setCompact] = useState(false);
  const panelId = useId();
  const titleId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const close = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setNow(Date.now());
    setCompact(window.matchMedia(SHEET_QUERY).matches);
    setOpen(true);
    inbox.reload();
    onOpen?.();
  };

  // Focus the panel on opening; close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // The phone sheet covers the page: stop the page behind it from scrolling.
  useEffect(() => {
    if (!open || !compact) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open, compact]);

  /** Sheet: keep Tab inside it. Dropdown: close once focus moves past it. */
  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !compact || !panelRef.current) return;
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === panelRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const onWrapBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (compact || !open) return;
    const next = event.relatedTarget as Node | null;
    if (next && !wrapRef.current?.contains(next)) setOpen(false);
  };

  const openNotification = (item: CustomerNotification) => {
    void inbox.markRead(item.id);
    setOpen(false);
  };

  const { unread, items, loading, error } = inbox;

  return (
    // From `sm` the wrapper is static, so the dropdown lines up with the header row, not the bell.
    <div ref={wrapRef} onBlur={onWrapBlur} className="relative sm:static">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={bellLabel(unread)}
        onClick={toggle}
        className={cx(
          // Phones: a bare icon in the header's text colour, beside Menu (narrower under 360px).
          // From `sm`: the header's square bordered button, beside "Book yachts".
          "relative inline-flex size-10 items-center justify-center max-[359px]:w-8",
          "sm:h-12 sm:w-12 lg:h-[3.25rem] lg:w-[3.25rem] sm:border sm:border-[#0d1b2a] sm:bg-white sm:text-[#0d1b2a] sm:transition-colors sm:duration-300 sm:hover:bg-[#0d1b2a] sm:hover:text-white",
          focusRingClass,
        )}
      >
        <Bell aria-hidden="true" strokeWidth={1.5} className="size-[1.125rem]" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            data-testid="notification-badge"
            className="bg-brand-950 absolute top-1 right-0 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[0.625rem] leading-none font-medium text-white ring-2 ring-white max-[359px]:-right-1 sm:-top-2 sm:-right-1.5"
          >
            {unreadBadge(unread)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal={compact || undefined}
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
          className={cx(
            "text-navy-ink motion-safe:animate-menu-in z-50 flex flex-col bg-white outline-none",
            compact
              ? "fixed inset-0 h-dvh"
              : // Just under the header (8px gap), right-aligned with "Book yachts".
                "border-rule absolute top-[calc(100%+0.5rem)] right-7 max-h-[min(34rem,calc(100dvh-var(--site-header-h)-1.5rem))] w-[24rem] border shadow-[0_18px_40px_rgba(6,26,43,0.14)]",
          )}
        >
          <div className="border-rule border-b px-5 pt-4 pb-3">
            <div className="flex items-center justify-between gap-4">
              <div id={titleId}>
                <CardTitle className="lg:text-[1.375rem]">Notifications</CardTitle>
              </div>
              {compact ? (
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => close(true)}
                  className="-mr-2 inline-flex size-10 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-ink"
                >
                  <X aria-hidden="true" strokeWidth={1.5} className="size-5" />
                </button>
              ) : null}
            </div>
            <div className="mt-1 flex min-h-6 items-center justify-between gap-4">
              <p className="text-body text-[12px]" aria-live="polite">
                {unread > 0 ? `${unread} unread` : items.length ? "No unread notifications" : ""}
              </p>
              {unread > 0 ? (
                <button
                  type="button"
                  disabled={inbox.markingAll}
                  onClick={() => void inbox.markAllRead()}
                  className={smallActionClass}
                >
                  Mark all as read
                </button>
              ) : null}
            </div>
            {inbox.actionError ? (
              <p role="alert" className="mt-2 text-[12px] leading-snug text-[#b42318]">
                {inbox.actionError}
              </p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading && !items.length ? (
              <div className="text-brand-600 flex justify-center px-5 py-10">
                <Spinner label="Loading your notifications" />
              </div>
            ) : error && !items.length ? (
              <div role="alert" className="px-5 py-8 text-center">
                <p className="text-body text-[13px] leading-relaxed">
                  We couldn’t load your notifications. Please check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={inbox.reload}
                  className={cx(smallActionClass, "mt-3")}
                >
                  Try again
                </button>
              </div>
            ) : !items.length ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <span
                  aria-hidden="true"
                  className="bg-pearl flex size-11 items-center justify-center rounded-full"
                >
                  <Bell strokeWidth={1.25} className="size-5" />
                </span>
                <p className="mt-4 text-[15px]">You’re all caught up.</p>
                <p className="text-body mt-1 max-w-[17rem] text-[12px] leading-relaxed">
                  Updates about your bookings, payments, refunds and proposals will appear here.
                </p>
              </div>
            ) : (
              <>
                <ul aria-label="Latest notifications" className="divide-rule divide-y">
                  {items.map((item) => (
                    <li key={item.id}>
                      <NotificationRow item={item} now={now} onOpen={openNotification} />
                    </li>
                  ))}
                </ul>
                {inbox.hasMore ? (
                  <div className="border-rule flex justify-center border-t px-5 py-3">
                    <button
                      type="button"
                      disabled={inbox.loadingMore}
                      aria-busy={inbox.loadingMore || undefined}
                      onClick={() => void inbox.loadMore()}
                      className={smallActionClass}
                    >
                      {inbox.loadingMore ? "Loading…" : "Show older notifications"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="border-rule flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-5 py-3">
            <Link
              href={userRoutes.accountNotifications}
              onClick={() => setOpen(false)}
              className={smallActionClass}
            >
              Notification settings
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({
  item,
  now,
  onOpen,
}: {
  item: CustomerNotification;
  now: number;
  onOpen: (item: CustomerNotification) => void;
}) {
  const unread = !item.read_at;
  const href = notificationHref(item);
  const className = cx(
    "flex w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-[#f9f7f2]",
    unread && "bg-pearl hover:bg-[#f1ebdf]",
    itemFocus,
  );
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cx(
          "relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          unread ? "bg-white" : "bg-pearl",
        )}
      >
        {createElement(iconFor(item.type), { strokeWidth: 1.5, className: "size-4" })}
        {unread ? (
          <span className="bg-brand-600 absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2 ring-white" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx("block text-[14px] leading-snug break-words", unread && "font-medium")}>
          {unread ? <span className="sr-only">Unread: </span> : null}
          {item.title}
        </span>
        {item.body ? (
          <span className="text-body mt-1 line-clamp-2 block text-[13px] leading-[1.45]">
            {item.body}
          </span>
        ) : null}
        <time
          dateTime={item.created_at}
          title={notificationFullTime(item.created_at)}
          className="text-body mt-1.5 block text-[11px]"
        >
          {notificationTimeAgo(item.created_at, now)}
        </time>
      </span>
    </>
  );

  return href ? (
    <Link href={href} onClick={() => onOpen(item)} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={() => onOpen(item)} className={className}>
      {content}
    </button>
  );
}
