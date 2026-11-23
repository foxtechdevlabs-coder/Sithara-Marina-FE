import { describe, expect, it } from "vitest";

import {
  appendPage,
  bellLabel,
  markAllReadLocally,
  markReadLocally,
  notificationHref,
  notificationTimeAgo,
  unreadBadge,
  type InboxState,
} from "@/features/user/notifications/utils/notification-inbox";
import type { CustomerNotification } from "@/services/user/notifications.service";

const READ_AT = "2026-11-16T10:00:00.000Z";

const note = (id: string, read = false): CustomerNotification => ({
  id,
  type: "booking_confirmed",
  title: `Title ${id}`,
  body: `Body ${id}`,
  entity_type: "booking",
  entity_id: `booking-${id}`,
  created_at: "2026-11-16T09:00:00.000Z",
  read_at: read ? "2026-11-16T09:30:00.000Z" : null,
});

// Three unread in view, five unread across the whole inbox (two beyond the list).
const state = (): InboxState => ({
  items: [note("a"), note("b"), note("c"), note("d", true)],
  unread: 5,
  total: 9,
});

describe("markReadLocally", () => {
  it("marks one notification read and drops the unread count by one", () => {
    const next = markReadLocally(state(), ["b"], READ_AT);
    expect(next.items.find((i) => i.id === "b")?.read_at).toBe(READ_AT);
    expect(next.items.filter((i) => !i.read_at).map((i) => i.id)).toEqual(["a", "c"]);
    expect(next.unread).toBe(4);
  });

  it("does not count notifications that were already read or are unknown", () => {
    const before = state();
    const next = markReadLocally(before, ["d", "missing"], READ_AT);
    expect(next).toBe(before); // nothing changed: same object, no re-render
    expect(next.items.find((i) => i.id === "d")?.read_at).toBe("2026-11-16T09:30:00.000Z");
  });

  it("never lets the count go below zero", () => {
    const next = markReadLocally(
      { items: [note("a"), note("b")], unread: 1, total: 2 },
      ["a", "b"],
      READ_AT,
    );
    expect(next.unread).toBe(0);
  });

  it("does not mutate the previous state", () => {
    const before = state();
    markReadLocally(before, ["a"], READ_AT);
    expect(before.items[0]?.read_at).toBeNull();
    expect(before.unread).toBe(5);
  });
});

describe("markAllReadLocally", () => {
  it("marks everything read and zeroes the inbox-wide count", () => {
    const next = markAllReadLocally(state(), READ_AT);
    expect(next.items.every((i) => i.read_at)).toBe(true);
    expect(next.unread).toBe(0);
    // Already-read notifications keep their original time.
    expect(next.items.find((i) => i.id === "d")?.read_at).toBe("2026-11-16T09:30:00.000Z");
  });

  it("returns the same state when nothing is unread", () => {
    const allRead: InboxState = { items: [note("a", true)], unread: 0, total: 1 };
    expect(markAllReadLocally(allRead, READ_AT)).toBe(allRead);
  });
});

describe("notificationHref", () => {
  it("opens the booking by its id (the booking page accepts ids)", () => {
    expect(notificationHref({ entity_type: "booking", entity_id: "b-1" })).toBe(
      "/account/bookings/b-1",
    );
  });

  it("opens the proposal by its id", () => {
    expect(notificationHref({ entity_type: "proposal", entity_id: "p-1" })).toBe(
      "/account/proposals/p-1",
    );
  });

  it("has nowhere to go for an unknown entity type or a missing id", () => {
    expect(notificationHref({ entity_type: "voucher", entity_id: "v-1" })).toBeNull();
    expect(notificationHref({ entity_type: "booking", entity_id: null })).toBeNull();
  });

  it("encodes ids so they cannot escape the path", () => {
    expect(notificationHref({ entity_type: "booking", entity_id: "../admin" })).not.toContain(
      "../",
    );
  });
});

describe("appendPage", () => {
  it("adds older notifications and skips ones already shown", () => {
    const next = appendPage([note("a"), note("b")], [note("b"), note("c")]);
    expect(next.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});

describe("badge and labels", () => {
  it("caps the badge at 99+", () => {
    expect(unreadBadge(1)).toBe("1");
    expect(unreadBadge(99)).toBe("99");
    expect(unreadBadge(100)).toBe("99+");
  });

  it("announces the unread count only when there is one", () => {
    expect(bellLabel(0)).toBe("Notifications");
    expect(bellLabel(3)).toBe("Notifications, 3 unread");
  });
});

describe("notificationTimeAgo", () => {
  const now = Date.parse("2026-11-16T12:00:00.000Z");
  const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  it("describes recent times relatively", () => {
    expect(notificationTimeAgo(ago(0), now)).toBe("Just now");
    expect(notificationTimeAgo(ago(5), now)).toBe("5 min ago");
    expect(notificationTimeAgo(ago(180), now)).toBe("3 h ago");
    expect(notificationTimeAgo(ago(30 * 60), now)).toBe("Yesterday");
  });

  it("shows the date (India time) for older ones", () => {
    expect(notificationTimeAgo("2026-11-10T20:00:00.000Z", now)).toBe("11 Nov");
  });

  it("shows nothing for an invalid date", () => {
    expect(notificationTimeAgo("not a date", now)).toBe("");
  });
});
