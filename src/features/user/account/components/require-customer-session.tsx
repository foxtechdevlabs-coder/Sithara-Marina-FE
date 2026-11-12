"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { userRoutes } from "@/constants/routes";
import { useAuthSession } from "@/features/user/auth/session";

const noopSubscribe = () => () => {};

/**
 * Account pages need a signed-in customer. The session lives in this tab's
 * `sessionStorage` (see auth/session.ts), so the check runs in the browser:
 * without one, the visitor is sent to sign in and brought back here after.
 * This is a UX gate only — the backend authorizes every account request.
 */
export function RequireCustomerSession({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  // False while hydrating, when the session store still reports "signed out".
  const isHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (session) {
      wasSignedIn.current = true;
      return;
    }
    // Signing out from the account pages navigates on its own.
    if (!isHydrated || wasSignedIn.current) return;
    router.replace(`${userRoutes.login}?next=${encodeURIComponent(pathname)}` as Route);
  }, [session, isHydrated, pathname, router]);

  if (!session) {
    return (
      <div className="text-brand-600 flex min-h-[50vh] items-center justify-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }
  return children;
}
