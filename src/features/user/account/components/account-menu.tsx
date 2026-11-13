"use client";

import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { getMyProfile } from "@/services/user/profile.service";

import { AccountNavList } from "./account-nav-list";
import { AccountHeading, Card, textButtonClass } from "./account-ui";
import { SignOutButton } from "./sign-out-button";

/** Figma C66 "Account navigation": every account section on one page (the mobile menu). */
export function AccountMenu() {
  const profile = useApiQuery(getMyProfile, "my-profile").data;

  return (
    <>
      <AccountHeading
        heading="Your account,"
        headingSerif="at a glance."
        subtitle="Choose the detail you would like to take care of."
      />

      <Card className="mt-8 max-w-[44rem] lg:mt-10" as="div">
        <div className="px-2.5">
          <p className="text-navy-ink min-h-7 text-[1.375rem] leading-tight">{profile?.fullName}</p>
          <p className="text-body mt-2 min-h-4 text-[11px]">
            {/* Signing in needs a verified email (POST /auth/login refuses others). */}
            {profile ? <>{profile.email}&nbsp;·&nbsp;Email verified</> : null}
          </p>
        </div>
        <AccountNavList className="mt-4" />
      </Card>

      <SignOutButton className="mt-6 w-auto" />
      <Link href={userRoutes.home} className={`${textButtonClass} mt-3 px-2.5`}>
        Return to the website
      </Link>
    </>
  );
}
