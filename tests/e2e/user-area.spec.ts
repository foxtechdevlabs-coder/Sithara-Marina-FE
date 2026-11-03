import { expect, test } from "@playwright/test";

// These tests verify routing, layouts and navigation of the user area against
// a production build. No backend is involved: every page is still a starter
// placeholder, so booking and availability DATA are NOT verified here.

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
  await expect(page.getByRole("contentinfo")).toBeVisible();
});

test("customer can navigate from home to yachts and open a yacht", async ({ page }) => {
  await page.goto("/");
  // The hero's button (the label also appears in later sections).
  await page.getByRole("link", { name: "Explore the yachts" }).first().click();
  await expect(page).toHaveURL("/yachts");
  await expect(page.getByRole("heading", { level: 1, name: "Our yachts" })).toBeVisible();

  // The detail page renders dummy data (Astra One) for any id until the API is wired up.
  const detail = await page.goto("/yachts/sea-breeze");
  expect(detail?.status()).toBe(200);
  await expect(page).toHaveTitle("Yacht details | Sithara Marina");
  await expect(page.getByRole("heading", { level: 1, name: "Astra One" })).toBeVisible();

  await page.goto("/yachts/sea-breeze/availability");
  await expect(page.getByRole("heading", { level: 1, name: "Check availability" })).toBeVisible();
});

test("forgot-password page is reachable from sign in and links back", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page).toHaveURL("/forgot-password");
  await expect(
    page.getByRole("heading", { level: 1, name: "A fresh start, simply arranged." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Send password reset link/ }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await expect(page).toHaveURL("/login");
});

test("verify-email page shows a neutral subtitle and accepts digits only", async ({ page }) => {
  await page.goto("/verify-email");
  await expect(
    page.getByRole("heading", { level: 1, name: "One last detail, then you are in." }),
  ).toBeVisible();
  // No email is handed over when the page is opened directly.
  await expect(
    page.getByText("Verify your email address to keep your journeys together."),
  ).toBeVisible();
  const code = page.getByLabel("Verification code");
  await code.pressSequentially("12ab3456789");
  await expect(code).toHaveValue("123456");
  await expect(page.getByRole("button", { name: /Resend code · / })).toBeDisabled();
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

test("sign-in page uses the site header and footer", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle("Sign in | Sithara Marina");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back." })).toBeVisible();
  await expect(siteHeader(page)).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
});

test("create-account page uses the site header and footer", async ({ page }) => {
  await page.goto("/register");
  await expect(page).toHaveTitle("Create an account | Sithara Marina");
  await expect(
    page.getByRole("heading", { level: 1, name: "Keep your journeys close." }),
  ).toBeVisible();
  await expect(siteHeader(page)).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toHaveAttribute("type", "password");
});

test("removed pages are no longer served", async ({ page }) => {
  for (const path of [
    "/about",
    "/contact",
    "/account",
    "/account/bookings",
    "/terms",
    "/privacy",
    "/cancellation-policy",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
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
  for (const path of ["/", "/yachts", "/checkout", "/plan-your-charter", "/login"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
