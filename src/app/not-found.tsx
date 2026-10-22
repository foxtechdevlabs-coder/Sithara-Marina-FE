import Link from "next/link";

import { userRoutes } from "@/constants/routes";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <p className="text-brand-600 text-sm font-semibold">404</p>
      <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
      <p className="text-muted mt-3">The page you are looking for does not exist or has moved.</p>
      <Link href={userRoutes.home} className="text-brand-700 mt-6 font-medium underline">
        Back to the home page
      </Link>
    </main>
  );
}
