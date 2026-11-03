"use client";

import { useSyncExternalStore } from "react";

import { readPendingVerificationEmail } from "../utils/pending-verification";

const noopSubscribe = () => () => {};

/**
 * "Verify <email> to keep your journeys together." using the address saved by
 * the registration form. Without one (opened directly, storage blocked) it
 * falls back to generic copy rather than showing a placeholder address.
 */
export function VerifyEmailSubtitle() {
  const email = useSyncExternalStore(noopSubscribe, readPendingVerificationEmail, () => null);

  return email ? (
    <>
      Verify <span className="break-all">{email}</span> to keep your journeys together.
    </>
  ) : (
    <>Verify your email address to keep your journeys together.</>
  );
}
