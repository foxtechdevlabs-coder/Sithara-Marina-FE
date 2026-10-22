import { expect, test } from "@playwright/test";

// Admin routing and layout checks. Authentication is NOT implemented yet, so
// these pages are currently reachable without signing in — that is a known
// production blocker, not something these tests endorse.

const adminSidebar = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Admin" });

test("/admin redirects to the dashboard", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL("/admin/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Sithara Marina Admin" })).toBeVisible();
  await expect(page).toHaveTitle("Dashboard | Sithara Marina Admin");
});

test("admin login does not render the dashboard shell (migration regression)", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { level: 1, name: "Staff sign-in" })).toBeVisible();
  await expect(adminSidebar(page)).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
});

test("dashboard pages use the admin shell, not the customer layout", async ({ page }) => {
  await page.goto("/admin/dashboard");
  await expect(adminSidebar(page)).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Footer" })).toHaveCount(0);
});

test("sidebar navigation works and marks the current section", async ({ page }) => {
  await page.goto("/admin/dashboard");
  const sidebar = adminSidebar(page);
  await expect(sidebar.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await sidebar.getByRole("link", { name: "Fleet" }).click();
  await expect(page).toHaveURL("/admin/fleet");
  await expect(page.getByRole("heading", { level: 1, name: "Fleet" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Fleet" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goto("/admin/fleet/y-1/pricing");
  await expect(sidebar.getByRole("link", { name: "Fleet" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("admin dynamic and nested routes respond", async ({ page }) => {
  for (const [path, heading] of [
    ["/admin/fleet/y-1", "Yacht"],
    ["/admin/fleet/y-1/edit", "Edit yacht"],
    ["/admin/fleet/y-1/pricing", "Yacht pricing"],
    ["/admin/bookings/b-1", "Booking details"],
    ["/admin/bookings/new", "New office booking"],
    ["/admin/customers/c-1", "Customer"],
    ["/admin/partners/p-1", "Partner"],
    ["/admin/availability/blocked", "Blocked dates"],
    ["/admin/staff/roles", "Roles & permissions"],
  ] as const) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});

test("admin responses carry noindex in both header and meta (indexing precaution only)", async ({
  page,
  request,
}) => {
  for (const path of ["/admin/login", "/admin/dashboard", "/admin/fleet"]) {
    const response = await request.get(path);
    expect(response.headers()["x-robots-tag"], path).toBe("noindex, nofollow");
  }
  await page.goto("/admin/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("admin shell has no horizontal overflow at the current viewport", async ({ page }) => {
  for (const path of ["/admin/dashboard", "/admin/login"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
