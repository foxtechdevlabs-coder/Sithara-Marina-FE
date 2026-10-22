"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Replace with an error-reporting service when one is chosen.
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted mt-3">Please try again. If the problem continues, contact us.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="bg-brand-700 hover:bg-brand-900 mt-6 self-start rounded-md px-4 py-2 text-white"
      >
        Try again
      </button>
    </main>
  );
}
