import { expect, test, type Page } from "@playwright/test";

// Admin routing and layout checks. MOCKED: no real backend or account is used.
// `signIn` stores a fake session and answers GET /admin/auth/me; every other
// backend request gets an empty answer, so pages may show their load-error state.

const adminSidebar = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Admin" });

const DESKTOP = { width: 1280, height: 800 };

async function signIn(page: Page) {
  await page.addInitScript(() => {
    const farFuture = 4102444800000;
    localStorage.setItem(
      "sm.admin.session",
      JSON.stringify({
        accessToken: "fake-access",
        refreshToken: "fake-refresh",
        expiresAt: farFuture,
        refreshAt: farFuture,
      }),
    );
  });
  await page.route(
    (url) => url.hostname !== "localhost" && url.pathname.startsWith("/admin/"),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "authorization,content-type",
        },
        body: new URL(route.request().url()).pathname.endsWith("/auth/me")
          ? JSON.stringify({
              id: "00000000-0000-4000-8000-000000000001",
              fullName: "Test Admin",
              email: "admin@example.com",
              role: "super_admin",
              permissions: [],
            })
          : "{}",
      }),
  );
}

test("the admin console requires signing in", async ({ page }) => {
  await page.goto("/admin");
  // Often the first page a just-started server renders, so this can take over 5 s.
  await expect(page).toHaveURL("/admin/login?next=%2Fadmin%2Fdashboard", { timeout: 15_000 });
  await expect(adminSidebar(page)).toHaveCount(0);
});

test("/admin redirects to the dashboard when signed in", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin");
  await expect(page).toHaveURL("/admin/dashboard");
  await expect(
    page.getByRole("heading", { level: 1, name: "A clear view of today." }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Overview | Sithara Marina Admin");
});

test("admin login does not render the dashboard shell (migration regression)", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("form", { name: "Staff sign-in" })).toBeVisible();
  await expect(adminSidebar(page)).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
});

test("dashboard pages use the admin shell, not the customer layout", async ({ page }) => {
  await page.setViewportSize(DESKTOP); // phones open the same navigation from a menu button
  await signIn(page);
  await page.goto("/admin/dashboard");
  await expect(adminSidebar(page)).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Footer" })).toHaveCount(0);
});

test("sidebar navigation works and marks the current section", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await signIn(page);
  await page.goto("/admin/dashboard");
  const sidebar = adminSidebar(page);
  await expect(sidebar.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await sidebar.getByRole("link", { name: "Yachts" }).click();
  await expect(page).toHaveURL("/admin/fleet");
  await expect(
    page.getByRole("heading", { level: 1, name: "The fleet, considered." }),
  ).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Yachts" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goto("/admin/fleet/y-1/pricing");
  await expect(sidebar.getByRole("link", { name: "Yachts" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("admin dynamic and nested routes respond", async ({ page }) => {
  test.slow(); // nine full page loads in one test
  await signIn(page);
  const yacht = await page.goto("/admin/fleet/y-1");
  expect(yacht?.status()).toBe(200);
  await expect(page).toHaveTitle("Yacht | Sithara Marina Admin");

  for (const [path, heading] of [
    ["/admin/fleet/y-1/edit", "Edit yacht, in detail."],
    ["/admin/fleet/y-1/pricing", "Slots & pricing."],
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
