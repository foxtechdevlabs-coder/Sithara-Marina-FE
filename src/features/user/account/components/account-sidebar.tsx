"use client";

import { UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

import { useApiQuery } from "@/hooks/use-api-query";
import { getMyProfile } from "@/services/user/profile.service";

import { AccountNavList } from "./account-nav-list";
import { SignOutButton } from "./sign-out-button";

/** Desktop sidebar: who is signed in, the account sections and Sign out. */
export function AccountSidebar() {
  // Reloaded on each navigation, so a saved name or email shows at once (the
  // previous answer stays on screen while it loads).
  const pathname = usePathname();
  const profile = useApiQuery(getMyProfile, `my-profile:${pathname}`).data;

  return (
    <div className="border-rule border bg-white px-4 pt-6 pb-5">
      <div className="px-2.5">
        <UserRound aria-hidden="true" strokeWidth={1.25} className="text-navy-ink size-6" />
        {/* Reserves its height while loading, so the navigation does not jump. */}
        <p className="text-navy-ink mt-3 min-h-7 truncate text-[1.375rem] leading-tight">
          {profile?.fullName}
        </p>
        <p className="text-body mt-2 min-h-4 truncate text-[11px]">{profile?.email}</p>
        {/* Signing in needs a verified email (POST /auth/login refuses others). */}
        {profile ? (
          <p className="bg-forest mt-2.5 flex h-[30px] w-full max-w-[13rem] items-center px-2.5 text-[11px] text-white">
            Email verified
          </p>
        ) : null}
      </div>
      <hr className="border-rule my-5" />
      <AccountNavList />
      <hr className="border-rule my-5" />
      <SignOutButton />
    </div>
  );
}
