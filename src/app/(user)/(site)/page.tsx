import { BRAND_NAME } from "@/constants/brand";
import Link from "next/link";

import { userRoutes } from "@/constants/routes";

/**
 * STARTER PAGE — verifies the app, layout, Tailwind and the shared package
 * work. Replace with the real home page (features/home) during UI development.
 */
export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-brand-600 text-xs font-semibold tracking-wider uppercase">
        Starter page — customer website
      </p>
      <h1 className="text-brand-900 mt-2 text-3xl font-semibold sm:text-4xl">{BRAND_NAME}</h1>
      <p className="text-muted mt-4 max-w-2xl">
        The customer website scaffold is running. Product pages will be built in the feature modules
        under <code>src/features</code>.
      </p>
      <Link
        href={userRoutes.yachts}
        className="bg-brand-700 hover:bg-brand-900 mt-8 inline-block rounded-md px-5 py-2.5 text-white"
      >
        Browse yachts
      </Link>
    </section>
  );
}
