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
    <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      {error.digest ? <p className="text-muted mt-3 text-sm">Reference: {error.digest}</p> : null}
      <button
        type="button"
        onClick={() => retry()}
        className="bg-accent-700 hover:bg-accent-600 mt-6 self-start rounded-md px-4 py-2 text-white"
      >
        Try again
      </button>
    </main>
  );
}
