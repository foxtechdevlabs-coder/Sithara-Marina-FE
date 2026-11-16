"use client";

import { useSyncExternalStore } from "react";

import { getMyProfile, type AccountUser } from "@/services/user/profile.service";

/*
 * The signed-in customer's profile (GET /auth/me), shared by the account pages
 * and the account sidebar:
 *
 * - Requests made at the same moment (a page and the sidebar mounting
 *   together) share one GET /auth/me.
 * - Every answer, and every saved change (PATCH /me, a new photo, a confirmed
 *   email), is published here, so the sidebar follows without asking again.
 * - It is cleared whenever the signed-in customer changes (see auth/session.ts).
 *
 * `avatar_url` is a signed link valid for 1 hour: this copy lives in memory
 * only, and each page load asks the backend again.
 */

let current: AccountUser | null = null;
let inFlight: Promise<AccountUser> | null = null;
/** Bumped by `clearMyProfile`, so an answer for the previous customer is dropped. */
let generation = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * GET /auth/me, shared with any request already running. Not tied to one
 * caller's signal (another may be waiting on it); `useApiQuery` ignores answers
 * for unmounted components.
 */
export function fetchMyProfile(): Promise<AccountUser> {
  if (inFlight) return inFlight;
  const startedIn = generation;
  const request = getMyProfile().then((user) => {
    if (startedIn === generation) {
      current = user;
      notify();
    }
    return user;
  });
  inFlight = request;
  const settle = () => {
    if (inFlight === request) inFlight = null;
  };
  request.then(settle, settle);
  return request;
}

/** Publishes a saved profile (PATCH /me, POST /me/email/verify). */
export function publishMyProfile(user: AccountUser): void {
  current = user;
  notify();
}

/** Changes the shared profile, e.g. the new `avatar_url` after a photo upload. */
export function updatePublishedProfile(change: (user: AccountUser) => AccountUser): void {
  if (!current) return;
  current = change(current);
  notify();
}

/** The signed-in customer changed: forget the profile and any answer on its way. */
export function clearMyProfile(): void {
  generation += 1;
  current = null;
  inFlight = null;
  notify();
}

export function readMyProfile(): AccountUser | null {
  return current;
}

/** React hook: the last known profile, or `null` until one has loaded. */
export function useMyProfile(): AccountUser | null {
  return useSyncExternalStore(subscribe, readMyProfile, () => null);
}
