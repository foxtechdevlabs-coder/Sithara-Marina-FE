"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getMyUnreadNotificationCount,
  listMyNotifications,
  markMyNotificationsRead,
} from "@/services/user/notifications.service";

import {
  appendPage,
  markAllReadLocally,
  markReadLocally,
  type InboxState,
} from "../utils/notification-inbox";

export interface NotificationInbox extends InboxState {
  /** True until the first answer, and while retrying after an error. */
  loading: boolean;
  /** Why the inbox couldn't be loaded (null once it loads). */
  error: unknown;
  /** Customer text when "Mark all as read" or "Show more" failed; cleared on the next attempt. */
  actionError: string | null;
  markingAll: boolean;
  /** More (older) notifications exist than are loaded. */
  hasMore: boolean;
  loadingMore: boolean;
  /** Reloads the newest page (the bell does on opening). */
  reload: () => void;
  /** Loads the next, older page under the loaded ones. */
  loadMore: () => Promise<void>;
  /** Marks one notification read (immediately on screen; reloaded if the server refuses). */
  markRead: (id: string) => Promise<void>;
  /** Marks every notification read; restored on screen if the server refuses. */
  markAllRead: () => Promise<void>;
}

/** The backend has no push for customers; it suggests polling the count about once a minute. */
export const UNREAD_POLL_MS = 60_000;

const EMPTY: InboxState = { items: [], unread: 0, total: 0 };
const MARK_ALL_FAILED = "We couldn’t mark your notifications as read. Please try again.";
const LOAD_MORE_FAILED = "We couldn’t load more notifications. Please try again.";

/**
 * The signed-in customer's notification inbox for the header bell.
 *
 * - The newest page loads when `enabled` (signed in) and again whenever
 *   `reload` is called (the bell does on opening).
 * - The badge stays current by polling GET /me/notifications/unread-count
 *   every minute while the tab is visible, on returning to the tab, and on
 *   every page change.
 * - Signing out empties it, so the next customer never sees the previous
 *   one's notifications.
 */
export function useNotificationInbox(enabled: boolean): NotificationInbox {
  const pathname = usePathname();
  const [inbox, setInbox] = useState<InboxState>(EMPTY);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadRef = useRef<AbortController | null>(null);
  const countRef = useRef<AbortController | null>(null);
  const inboxRef = useRef(inbox);
  const errorRef = useRef<unknown>(error);
  /**
   * Bumped by every read-marking. A load or count started before it answers
   * with the old unread state, so its answer is dropped.
   */
  const changeRef = useRef(0);
  useEffect(() => {
    inboxRef.current = inbox;
    errorRef.current = error;
  });

  const reload = useCallback(() => {
    loadRef.current?.abort();
    const controller = new AbortController();
    loadRef.current = controller;
    const change = changeRef.current;
    if (errorRef.current) setLoading(true); // retrying: show the loading state again
    listMyNotifications({ page: 1 }, controller.signal)
      .then((list) => {
        if (controller.signal.aborted || change !== changeRef.current) return;
        setInbox({ items: list.items, unread: list.unread_count, total: list.total });
        setPage(1);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, []);

  /** Refreshes the badge only. A failure keeps the last count (the next poll retries). */
  const refreshCount = useCallback(() => {
    countRef.current?.abort();
    const controller = new AbortController();
    countRef.current = controller;
    const change = changeRef.current;
    getMyUnreadNotificationCount(controller.signal)
      .then((unread) => {
        if (controller.signal.aborted || change !== changeRef.current) return;
        setInbox((state) => (state.unread === unread ? state : { ...state, unread }));
      })
      .catch(() => {});
  }, []);

  // Signed in: load the newest page, then keep the badge current.
  useEffect(() => {
    if (!enabled) return;
    const first = setTimeout(reload, 0);
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refreshCount();
    }, UNREAD_POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refreshCount();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      loadRef.current?.abort();
      countRef.current?.abort();
      // Signed out (or unmounted): drop this customer's notifications.
      changeRef.current += 1;
      setInbox(EMPTY);
      setPage(1);
      setLoading(true);
      setError(null);
      setActionError(null);
      setLoadingMore(false);
    };
  }, [enabled, reload, refreshCount]);

  // Every page change refreshes the badge (the first page is covered by the load above).
  const firstPathRef = useRef(true);
  useEffect(() => {
    if (firstPathRef.current) {
      firstPathRef.current = false;
      return;
    }
    if (!enabled) return;
    const timer = setTimeout(refreshCount, 0);
    return () => clearTimeout(timer);
  }, [pathname, enabled, refreshCount]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setActionError(null);
    setLoadingMore(true);
    const next = page + 1;
    try {
      const list = await listMyNotifications({ page: next });
      setInbox((state) => ({
        items: appendPage(state.items, list.items),
        unread: list.unread_count,
        total: list.total,
      }));
      setPage(next);
    } catch {
      setActionError(LOAD_MORE_FAILED);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page]);

  const markRead = useCallback(
    async (id: string) => {
      const target = inboxRef.current.items.find((item) => item.id === id);
      if (!target || target.read_at) return;
      changeRef.current += 1;
      setInbox((state) => markReadLocally(state, [id], new Date().toISOString()));
      try {
        const { unread_count } = await markMyNotificationsRead({ ids: [id] });
        setInbox((state) => ({ ...state, unread: unread_count }));
      } catch {
        reload(); // show what the server actually holds
      }
    },
    [reload],
  );

  const markAllRead = useCallback(async () => {
    const before = inboxRef.current;
    changeRef.current += 1;
    setActionError(null);
    setMarkingAll(true);
    setInbox((state) => markAllReadLocally(state, new Date().toISOString()));
    try {
      const { unread_count } = await markMyNotificationsRead({ all: true });
      setInbox((state) => ({ ...state, unread: unread_count }));
    } catch {
      setInbox(before);
      setActionError(MARK_ALL_FAILED);
    } finally {
      setMarkingAll(false);
    }
  }, []);

  return {
    ...inbox,
    loading,
    error,
    actionError,
    markingAll,
    hasMore: inbox.items.length < inbox.total,
    loadingMore,
    reload,
    loadMore,
    markRead,
    markAllRead,
  };
}
