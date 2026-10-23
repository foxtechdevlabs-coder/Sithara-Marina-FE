import { expect, test } from "@playwright/test";

// These tests verify routing, layouts and navigation of the user area against
// a production build. No backend is involved: every page is still a starter
// placeholder, so booking, availability and account DATA are NOT verified here.

// The main navigation sits behind the header's menu button at every viewport.
const siteHeader = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Open menu" });

test("home page renders inside the site layout", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Sithara Marina — Yacht Charters");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sail into the soul of Kerala." }),
  ).toBeVisible();
  await expect(siteHeader(page)).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Footer" })).toBeVisible();
});

test("customer can navigate from home to yachts and open a yacht", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explore the yachts" }).click();
  await expect(page).toHaveURL("/yachts");
  await expect(page.getByRole("heading", { level: 1, name: "Our yachts" })).toBeVisible();

  await page.goto("/yachts/sea-breeze");
  await expect(page.getByRole("heading", { level: 1, name: "Yacht details" })).toBeVisible();
  await expect(page.getByText("yachtId: sea-breeze")).toBeVisible();

  await page.goto("/yachts/sea-breeze/availability");
  await expect(page.getByRole("heading", { level: 1, name: "Check availability" })).toBeVisible();
});

test("checkout uses the distraction-free layout and fabricates no booking", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
  await expect(siteHeader(page)).toHaveCount(0);
  await expect(page.getByText(/confirmed/i)).toHaveCount(0);

  await page.goto("/checkout/confirmation/b-123");
  await expect(page.getByRole("heading", { level: 1, name: "Booking confirmation" })).toBeVisible();
  await expect(page.getByText(/only after the backend confirms/i)).toBeVisible();
});

test("auth pages use the centred layout without site navigation", async ({ page }) => {
  for (const [path, heading] of [
    ["/login", "Sign in"],
    ["/register", "Create an account"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(siteHeader(page)).toHaveCount(0);
  }
});

test("account pages render with the account navigation", async ({ page }) => {
  for (const [path, heading] of [
    ["/account", "My profile"],
    ["/account/bookings", "My bookings"],
    ["/account/bookings/b-1", "Booking details"],
    ["/account/bookings/b-1/invoice", "Invoice"],
    ["/account/bookings/b-1/cancel", "Request cancellation"],
  ] as const) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Account" })).toBeVisible();
  }
});

test("static content pages are reachable from the footer", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Footer" });
  for (const [label, heading] of [
    ["About", "About us"],
    ["Contact", "Contact us"],
    ["Terms & Conditions", "Terms & Conditions"],
    ["Privacy Policy", "Privacy Policy"],
    ["Cancellation Policy", "Cancellation Policy"],
  ] as const) {
    await footer.getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});

test("unknown URLs return 404 with the not-found page", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
});

test("user pages are indexable and not served with admin robots headers", async ({ request }) => {
  const response = await request.get("/yachts");
  expect(response.headers()["x-robots-tag"]).toBeUndefined();
});

test("layout has no horizontal overflow at the current viewport", async ({ page }) => {
  for (const path of ["/", "/yachts", "/checkout", "/account/bookings", "/login"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
