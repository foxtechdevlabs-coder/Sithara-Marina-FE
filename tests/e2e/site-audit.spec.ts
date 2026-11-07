import { expect, test } from "@playwright/test";

// Layout safety net for every public page at phone, tablet and desktop widths.
// No backend is involved: these pages render without API data today.

const PAGES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email/pending",
  "/plan-your-charter",
  "/search",
  "/yachts",
  "/checkout",
  "/admin/login",
];

const WIDTHS = [
  ["small phone", 320, 640],
  ["phone", 390, 844],
  ["tablet", 820, 1180],
  ["desktop", 1440, 900],
] as const;

for (const [name, width, height] of WIDTHS) {
  test(`pages fit a ${name} with no failed assets`, async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width, height });
    const failed: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
    });

    for (const path of PAGES) {
      expect((await page.goto(path))?.status(), path).toBe(200);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
    }
    expect(failed).toEqual([]);
  });
}
