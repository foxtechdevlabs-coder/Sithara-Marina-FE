"use client";

import { useSyncExternalStore } from "react";

import {
  readPendingVerificationEmail,
  subscribePendingVerification,
} from "../utils/pending-verification";

/** The address saved by the registration form, or generic text when there is none. */
export function PendingEmail() {
  const email = useSyncExternalStore(
    subscribePendingVerification,
    readPendingVerificationEmail,
    () => null,
  );

  return email ? <span className="break-all">{email}</span> : <>your email address</>;
}
