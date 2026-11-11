import type { Metadata } from "next";

import { ProfileDetailsForm } from "@/features/user/profile/components/profile-details-form";
import { getProfile } from "@/services/user/profile.service";

export const metadata: Metadata = {
  title: "Your details",
};

export default async function AccountProfilePage() {
  const profile = await getProfile();

  return (
    <>
      <p className="text-slate-ink text-[11px] tracking-[0.14em] uppercase">
        Sithara Marina / Account
      </p>
      <h1 className="mt-4 text-[2.5rem] leading-[1.05] tracking-[-0.03em] lg:mt-5 lg:text-[4.5rem]">
        Your details, <span className="font-serif tracking-normal">kept personal.</span>
      </h1>
      <p className="text-slate-ink mt-5 text-[15px] leading-relaxed lg:mt-8">
        Update your profile and preferred contact details.
      </p>
      <ProfileDetailsForm profile={profile} className="mt-6 lg:mt-7" />
    </>
  );
}
