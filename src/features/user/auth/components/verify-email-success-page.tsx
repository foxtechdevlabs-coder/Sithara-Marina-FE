"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { userRoutes } from "@/constants/routes";

import { readAuthSession, useAuthSession } from "../session";
import { EmailVerifiedWelcome } from "./email-verified-welcome";

/**
 * Reached from the verification callback after POST /auth/verify-email → 200,
 * which saves the session and its user first. Without a session nothing has been
 * verified in this tab, so the page hands over to the pending page instead of
 * claiming success. A login session has no user and no verification to report,
 * so it goes home.
 */
export function VerifyEmailSuccessPage() {
  const router = useRouter();
  const session = useAuthSession();
  const user = session?.user;

  useEffect(() => {
    // Reads storage directly: the hook's value is `null` until hydration finishes.
    // Re-runs when the session changes, so logging out here leaves the page too.
    const stored = readAuthSession();
    if (!stored) router.replace(userRoutes.verifyEmailPending);
    else if (!stored.user) router.replace(userRoutes.home);
  }, [router, session]);

  if (!user) return null;

  return <EmailVerifiedWelcome user={user} onContinue={() => router.replace(userRoutes.home)} />;
}
