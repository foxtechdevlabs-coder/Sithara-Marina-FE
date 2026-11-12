"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { userRoutes } from "@/constants/routes";
import { signOut } from "@/features/user/auth/session";
import { cx } from "@/lib/cx";

/**
 * Ends the session and returns to the home page. The local session is cleared
 * at once; the backend revocation finishes in the background (see `signOut`).
 */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const onClick = () => {
    setIsSigningOut(true);
    router.replace(userRoutes.home);
    void signOut();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSigningOut}
      className={cx(
        "focus-visible:outline-navy-ink text-navy-ink flex min-h-11 w-full items-center gap-3 px-2.5 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60",
        className,
      )}
    >
      <LogOut aria-hidden="true" strokeWidth={1.5} className="size-[18px] shrink-0" />
      Sign out
    </button>
  );
}
