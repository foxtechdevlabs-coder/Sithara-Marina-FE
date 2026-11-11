"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { LoadingLogo } from "@/components/shared/loading-logo";
import { adminRoutes } from "@/constants/routes";

import { useAdminSession } from "./admin-session-provider";

const OFFLINE_RETRY_MS = 5_000;

/**
 * Shows the admin console only to a signed-in admin or super admin. Anyone
 * else goes to the sign-in screen and comes back to this page afterwards.
 *
 * This is a UI guard only; the backend enforces access on every admin endpoint.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, endReason, reload } = useAdminSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    // A deliberate sign-out lands on the plain sign-in page.
    if (endReason === "signed-out") {
      router.replace(adminRoutes.login);
      return;
    }
    const params = new URLSearchParams({ next: pathname });
    if (endReason === "expired" || endReason === "forbidden") params.set("reason", endReason);
    router.replace(`${adminRoutes.login}?${params.toString()}` as Route);
  }, [status, endReason, pathname, router]);

  // A short network or DNS failure shouldn't need a click: keep retrying, and
  // retry at once when the browser reports the connection is back.
  useEffect(() => {
    if (status !== "offline") return;
    let checking = false;
    const retry = async () => {
      if (checking) return; // a slow attempt can outlast the interval
      checking = true;
      await reload();
      checking = false;
    };
    const timer = setInterval(retry, OFFLINE_RETRY_MS);
    window.addEventListener("online", retry);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", retry);
    };
  }, [status, reload]);

  if (status === "authenticated") return children;

  if (status === "offline") {
    return (
      <div
        role="alert"
        className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <p className="text-[15px]">
          We couldn&rsquo;t reach the server to check your session. Trying again automatically…
        </p>
        <p className="max-w-[460px] text-[13px] text-[#4a4f55]">
          The server may be starting up, which can take up to a minute. If this doesn&rsquo;t clear,
          check your connection.
        </p>
        <button
          type="button"
          onClick={() => void reload()}
          className="h-[44px] border border-[#0d1b2a] px-6 text-[13px] hover:bg-[#f2f1ee]"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoadingLogo label="Checking your session" size="page" />
    </div>
  );
}
