import { BRAND_NAME } from "@/constants/brand";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * STARTER PAGE — verifies the admin app, dashboard shell, Tailwind and the
 * shared package work. Replace with the real overview (features/dashboard).
 */
export default function DashboardPage() {
  return (
    <section className="px-6 py-8">
      <p className="text-accent-700 text-xs font-semibold tracking-wider uppercase">
        Starter page — admin dashboard
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{BRAND_NAME} Admin</h1>
      <p className="text-muted mt-3 max-w-2xl">
        The admin dashboard scaffold is running. Dashboard statistics and management screens will be
        built in the feature modules under <code>src/features</code>.
      </p>
    </section>
  );
}
