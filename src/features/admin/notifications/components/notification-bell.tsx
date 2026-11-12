"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { BODY, INK, MUTED } from "@/components/admin/admin-theme";
import { adminRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import { markAlertsRead, type Alert } from "@/services/admin/notifications.service";

import { useAlertFeed } from "../hooks/use-alert-feed";
import {
  alertHref,
  announceAlertsChanged,
  notificationErrorMessage,
  severityOf,
  timeAgo,
} from "../utils/notification-format";

/**
 * The bell in the admin header: unread count, and a panel with the newest
 * alerts. Opening an alert marks it read and goes to its booking or enquiry.
 */
export function NotificationBell({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();
  const panelId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const feed = useAlertFeed(8);

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function openAlert(a: Alert) {
    setOpen(false);
    if (!a.read_at) {
      try {
        await markAlertsRead({ ids: [a.id] });
        announceAlertsChanged();
      } catch {
        /* the alert still opens */
      }
    }
    router.push(alertHref(a.entity_type, a.entity_id) ?? adminRoutes.notifications);
  }

  async function readAll() {
    setBusy(true);
    try {
      await markAlertsRead({ all: true });
      announceAlertsChanged();
    } finally {
      setBusy(false);
    }
  }

  const count = feed.unread > 99 ? "99+" : String(feed.unread);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={feed.unread ? `Notifications, ${feed.unread} unread` : "Notifications"}
        onClick={() => {
          setNow(Date.now());
          setOpen((o) => !o);
          if (!open) feed.reload();
        }}
        className={cx(
          "relative flex size-[47px] items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          tone === "light"
            ? "border bg-white hover:bg-[#f2f1ee] focus-visible:outline-[#0d1b2a]"
            : "text-white hover:bg-white/10 focus-visible:outline-white",
        )}
        style={tone === "light" ? { borderColor: INK } : undefined}
      >
        <Bell aria-hidden="true" strokeWidth={1.5} className="size-[18px]" />
        {feed.unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-[6px] -right-[6px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[10px] leading-none text-white"
            style={{ backgroundColor: "#b3261e" }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-[12px] top-[104px] z-50 flex max-h-[min(520px,calc(100dvh-120px))] flex-col border border-[#dcdad5] bg-white text-[#0d1b2a] shadow-[0_12px_32px_rgba(13,27,42,0.16)] lg:absolute lg:inset-x-auto lg:top-[calc(100%+8px)] lg:right-0 lg:w-[380px]"
        >
          <div className="flex items-center justify-between border-b border-[#ebe9e4] px-[16px] py-[12px]">
            <p className="text-[15px]">
              Notifications
              {feed.unread > 0 && (
                <span className="ml-[6px] text-[11px]" style={{ color: BODY }}>
                  {feed.unread} unread
                </span>
              )}
            </p>
            {feed.unread > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void readAll()}
                className="text-[11px] underline underline-offset-2 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {feed.loading && !feed.items.length ? (
              <p className="px-[16px] py-[18px] text-[12px]" style={{ color: MUTED }}>
                Loading…
              </p>
            ) : feed.error && !feed.items.length ? (
              <p className="px-[16px] py-[18px] text-[12px] text-[#9b2c2c]">
                {notificationErrorMessage(feed.error)}{" "}
                <button type="button" onClick={feed.reload} className="underline">
                  Try again
                </button>
              </p>
            ) : !feed.items.length ? (
              <p className="px-[16px] py-[22px] text-center text-[12px]" style={{ color: MUTED }}>
                You’re all caught up.
              </p>
            ) : (
              <ul>
                {feed.items.map((a) => {
                  const sev = severityOf(a.severity);
                  return (
                    <li key={a.id} className="border-b border-[#f0eee9] last:border-b-0">
                      <button
                        type="button"
                        onClick={() => void openAlert(a)}
                        className={cx(
                          "flex w-full gap-[10px] px-[16px] py-[12px] text-left transition-colors hover:bg-[#f7f5f1] focus-visible:bg-[#f7f5f1] focus-visible:outline-none",
                          !a.read_at && "bg-[#fbf9f5]",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="mt-[5px] size-[8px] shrink-0 rounded-full"
                          style={{ backgroundColor: a.read_at ? "#d8d6d1" : sev.color }}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cx(
                              "block text-[13px] break-words",
                              !a.read_at && "font-medium",
                            )}
                          >
                            <span className="sr-only">
                              {a.read_at ? "" : "Unread. "}
                              {sev.label}:{" "}
                            </span>
                            {a.title}
                          </span>
                          {a.body && (
                            <span
                              className="mt-[2px] line-clamp-2 block text-[12px]"
                              style={{ color: BODY }}
                            >
                              {a.body}
                            </span>
                          )}
                          <span className="mt-[4px] block text-[10px]" style={{ color: MUTED }}>
                            {timeAgo(a.created_at, now)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#ebe9e4] px-[16px] py-[10px]">
            <Link
              href={adminRoutes.notifications}
              onClick={() => setOpen(false)}
              className="text-[12px] underline underline-offset-2"
            >
              View all notifications
            </Link>
            <span className="text-[10px]" style={{ color: MUTED }}>
              {feed.mode === "live" ? "Live" : "Updates every minute"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
