"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { listGuestVideos, type GuestVideo } from "@/services/user/content.service";

/** A guest video that can be played: one without a link is left out. */
export type PlayableGuestVideo = GuestVideo & { video_url: string };

export type GuestVideosState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; videos: PlayableGuestVideo[] };

/** The backend's page size; the section shows one page. */
const PAGE = { page: 1, limit: 20 } as const;
/** Video links are signed for an hour; renew them a little before that. */
const LINKS_STALE_MS = 50 * 60_000;
/** A video that fails to load right after a fetch is broken, not expired: don't refetch for it. */
const MIN_REFETCH_GAP_MS = 60_000;

export function playableGuestVideos(items: GuestVideo[]): PlayableGuestVideo[] {
  return items.filter((item): item is PlayableGuestVideo => Boolean(item.video_url?.trim()));
}

/**
 * The published guest videos (GET /content/guest-videos), fetched in the
 * browser each time the section mounts and never cached, because every
 * `video_url` is a signed link that expires after an hour. Links are renewed
 * silently when they may have expired: when the page is shown again after a
 * long time (another tab, back/forward cache) or when a video fails to load.
 */
export function useGuestVideos() {
  const [state, setState] = useState<GuestVideosState>({ status: "loading" });
  const fetchedAt = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  /**
   * "initial": the first load (the state already says loading). "retry": after
   * an error. "renew": new links for the videos on show, which stay on screen
   * meanwhile and are kept if the request fails.
   */
  const load = useCallback((mode: "initial" | "retry" | "renew") => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const silent = mode === "renew";
    if (mode === "retry") setState({ status: "loading" });
    listGuestVideos(PAGE, controller.signal).then(
      ({ items }) => {
        if (controller.signal.aborted) return;
        fetchedAt.current = Date.now();
        setState({ status: "ready", videos: playableGuestVideos(items) });
      },
      () => {
        if (controller.signal.aborted || silent) return;
        setState({ status: "error" });
      },
    );
  }, []);

  useEffect(() => {
    load("initial");
    return () => inFlight.current?.abort();
  }, [load]);

  // Coming back to a page opened long ago: its links may have expired.
  useEffect(() => {
    const renewIfStale = () => {
      if (document.visibilityState !== "visible" || fetchedAt.current === 0) return;
      if (Date.now() - fetchedAt.current >= LINKS_STALE_MS) load("renew");
    };
    document.addEventListener("visibilitychange", renewIfStale);
    window.addEventListener("pageshow", renewIfStale);
    return () => {
      document.removeEventListener("visibilitychange", renewIfStale);
      window.removeEventListener("pageshow", renewIfStale);
    };
  }, [load]);

  /** A video failed to load: its signed link may have expired, so fetch fresh links once. */
  const onVideoError = useCallback(() => {
    if (fetchedAt.current !== 0 && Date.now() - fetchedAt.current >= MIN_REFETCH_GAP_MS) {
      fetchedAt.current = Date.now(); // one renewal for a burst of failing videos
      load("renew");
    }
  }, [load]);

  const retry = useCallback(() => load("retry"), [load]);

  return { state, retry, onVideoError };
}
