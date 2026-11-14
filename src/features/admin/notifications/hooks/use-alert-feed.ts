"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getStreamToken,
  listAlerts,
  streamUrl,
  type Alert,
} from "@/services/admin/notifications.service";

import { ALERTS_CHANGED } from "../utils/notification-format";

const POLL_MS = 60_000;
const RETRY_MS = [5_000, 15_000, 30_000, 60_000];

export interface AlertFeed {
  items: Alert[];
  unread: number;
  /** "live" while the stream is open, "polling" otherwise. */
  mode: "live" | "polling";
  loading: boolean;
  error: unknown;
  reload: () => void;
}

/**
 * The newest alerts and the unread count, kept up to date: a live stream
 * (POST …/stream-token, then GET …/stream?token=) refreshes the list on every
 * event; without it (Redis down, network) the list is checked every minute.
 * Also refreshes when the tab comes back and when alerts are marked read.
 */
export function useAlertFeed(limit = 8, enabled = true): AlertFeed {
  const [items, setItems] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const [mode, setMode] = useState<"live" | "polling">("polling");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const loadRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => {
    loadRef.current?.abort();
    const controller = new AbortController();
    loadRef.current = controller;
    listAlerts({ limit }, controller.signal)
      .then((list) => {
        setItems(list.items);
        setUnread(list.unread_count);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [limit]);

  // First load, polling fallback, focus and "marked read" refreshes.
  useEffect(() => {
    if (!enabled) return;
    const first = setTimeout(reload, 0);
    const poll = setInterval(reload, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(ALERTS_CHANGED, reload);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(ALERTS_CHANGED, reload);
      loadRef.current?.abort();
    };
  }, [enabled, reload]);

  // The live stream, reconnecting with a fresh single-use token.
  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let stopped = false;

    const connect = async () => {
      try {
        const { token } = await getStreamToken();
        if (stopped) return;
        source = new EventSource(streamUrl(token));
        source.onopen = () => {
          attempt = 0;
          setMode("live");
        };
        // Any event means something changed: reload the list (the event format is not relied on).
        source.onmessage = () => reload();
        source.onerror = () => {
          source?.close();
          source = null;
          setMode("polling");
          schedule();
        };
      } catch {
        setMode("polling");
        schedule();
      }
    };
    const schedule = () => {
      if (stopped) return;
      const wait = RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]!;
      attempt += 1;
      retry = setTimeout(() => void connect(), wait);
    };

    void connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      source?.close();
    };
  }, [enabled, reload]);

  return { items, unread, mode, loading, error, reload };
}
