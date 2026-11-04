import Image from "next/image";

import { SERIF } from "@/components/user/marina-chrome";

import { AccountPageShell } from "./account-page-shell";
import { SignInForm } from "./sign-in-form";

/** "Welcome back." sign-in page: form on the left, yacht photo on the right. */
export function SignInPage() {
  return (
    <AccountPageShell
      headingId="sign-in-heading"
      heading="Welcome"
      headingSerif="back."
      subtitle="Your journeys, enquiries and considered details, all in one place."
      aside={
        <figure className="mt-16 md:mt-0 md:pt-[17rem] lg:pt-[calc(var(--r)*239)]">
          <div className="relative aspect-[440/520] w-full max-w-[27.5rem]">
            <Image
              src="/images/yachts/astra-one-hero.png"
              alt="A white superyacht cruising past a forested headland in warm evening light"
              fill
              sizes="(min-width: 1024px) 26vw, (min-width: 768px) 22rem, 100vw"
              className="object-cover object-[78%_50%]"
            />
          </div>
          <figcaption
            className="mt-7 text-[1.75rem] leading-tight italic lg:mt-[calc(var(--r)*35)] lg:text-[max(calc(var(--r)*32),24px)]"
            style={SERIF}
          >
            A little further from everyday.
          </figcaption>
        </figure>
      }
    >
      <SignInForm />
    </AccountPageShell>
  );
}
