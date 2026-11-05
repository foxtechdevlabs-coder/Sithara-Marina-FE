"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { userRoutes } from "@/constants/routes";

import { readPendingVerification } from "../utils/pending-verification";

/**
 * The "email failed" page reports what happened to this tab's registration.
 * Opened without one it would be reporting nothing, so it hands over to the
 * pending page, which works for any address.
 */
export function RequirePendingVerification() {
  const router = useRouter();

  useEffect(() => {
    if (!readPendingVerification()) router.replace(userRoutes.verifyEmailPending);
  }, [router]);

  return null;
}
