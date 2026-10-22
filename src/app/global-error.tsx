"use client";

// Catches errors thrown by the root layout itself. It replaces the root layout,
// so it must render its own <html> and <body> and cannot rely on globals.css.
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", textAlign: "center" }}
      >
        <h1>Something went wrong</h1>
        <button type="button" onClick={() => retry()}>
          Try again
        </button>
      </body>
    </html>
  );
}
