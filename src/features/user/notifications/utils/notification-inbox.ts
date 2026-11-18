import type { Route } from "next";

import { userRoutes } from "@/constants/routes";
import type { CustomerNotification } from "@/services/user/notifications.service";

/** What the bell holds: the loaded notifications (newest first) and the inbox-wide counts. */
export interface InboxState {
  items: CustomerNotification[];
  unread: number;
  /** All of the customer's notifications, read or not (decides "Show more"). */
  total: number;
}

/**
 * Adds an older page under the loaded items. Skips ids already shown: a
 * notification created between two page loads shifts the pages by one.
 */
export function appendPage(
  current: readonly CustomerNotification[],
  page: readonly CustomerNotification[],
): CustomerNotification[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...page.filter((item) => !seen.has(item.id))];
}

/**
 * Marks `ids` read locally (before the server answers). The unread count drops
 * by the number of notifications that actually changed, since it also covers
 * notifications not in `items`.
 */
export function markReadLocally(
  state: InboxState,
  ids: readonly string[],
  readAt: string,
): InboxState {
  const wanted = new Set(ids);
  let changed = 0;
  const items = state.items.map((item) => {
    if (item.read_at || !wanted.has(item.id)) return item;
    changed += 1;
    return { ...item, read_at: readAt };
  });
  return changed ? { ...state, items, unread: Math.max(0, state.unread - changed) } : state;
}

/** Marks everything read locally. */
export function markAllReadLocally(state: InboxState, readAt: string): InboxState {
  if (!state.unread && state.items.every((item) => item.read_at)) return state;
  return {
    ...state,
    items: state.items.map((item) => (item.read_at ? item : { ...item, read_at: readAt })),
    unread: 0,
  };
}

/**
 * The account page a notification opens: its booking (that page accepts the
 * booking's id as well as its reference) or its proposal. Null when it names
 * neither, e.g. an entity type added on the backend later.
 */
export function notificationHref(
  item: Pick<CustomerNotification, "entity_type" | "entity_id">,
): Route | null {
  if (!item.entity_id) return null;
  switch (item.entity_type) {
    case "booking":
      return userRoutes.accountBooking(item.entity_id);
    case "proposal":
      return userRoutes.accountProposal(item.entity_id);
    default:
      return null;
  }
}

/** "3", or "99+" past 99. */
export const unreadBadge = (count: number): string => (count > 99 ? "99+" : String(count));

/** The bell's accessible name. */
export const bellLabel = (unread: number): string =>
  unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

const IST = "Asia/Kolkata";

/** "Just now", "5 min ago", "3 h ago", "Yesterday", "12 Nov" (India time). */
export function notificationTimeAgo(iso: string, now: number): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.floor((now - time) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return "Yesterday";
  return new Date(time).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: IST,
  });
}

/** Full date and time for the tooltip: "16 Nov 2026, 2:05 pm". */
export function notificationFullTime(iso: string): string {
  const time = new Date(iso);
  if (Number.isNaN(time.getTime())) return "";
  return time.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  });
}
