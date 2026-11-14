import { expect, test } from "@playwright/test";

// These tests verify routing, layouts and navigation of the user area against
// a production build. Auth calls are mocked. Yacht data is covered by yachts.spec.ts
// against a mock API, so booking and availability DATA are NOT verified here.

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

test("signed-in home shows the search bar until the user logs out", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route("**/auth/logout", (route) => route.abort());
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    sessionStorage.setItem(
      "sithara-marina:auth-session",
      JSON.stringify({
        accessToken: `header.${btoa(JSON.stringify({ exp: 4102444800 }))}.signature`,
        refreshToken: "id.secret",
      }),
    );
  });

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");

  // Logout is inside the header menu.
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore the yachts" }).first()).toBeVisible();
  // The logout request was aborted above, so revocation could not be confirmed.
  await expect(
    page.getByRole("alert").filter({ hasText: "signed out on this device" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByText("signed out on this device")).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("home featured yachts use dummy data, whatever the API does", async ({ page }) => {
  const calls: string[] = [];
  await page.route(
    (url) => url.hostname !== "localhost" && url.pathname.startsWith("/yachts"),
    (route) => {
      calls.push(route.request().url());
      return route.fulfill({ status: 500, body: "{}" });
    },
  );
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "Featured yachts" });

  await expect(page.getByRole("heading", { name: "Featured yacht." })).toBeVisible();
  await expect(carousel.getByRole("heading", { name: "Astra One" })).toBeVisible();
  await expect(carousel.getByRole("button", { name: /^Show / })).toHaveCount(4);

  await carousel.getByRole("button", { name: "Next yacht" }).click();
  await expect(carousel.getByRole("heading", { name: "Malabar" })).toBeVisible();
  await carousel.getByRole("button", { name: "Previous yacht" }).click();
  await expect(carousel.getByRole("heading", { name: "Astra One" })).toBeVisible();
  expect(calls).toEqual([]);
});

test("customer can navigate from home to the yachts page", async ({ page }) => {
  await page.goto("/");
  // The hero's button (the label also appears in later sections).
  await page.getByRole("link", { name: "Explore the yachts" }).first().click();
  await expect(page).toHaveURL("/yachts");
  await expect(
    page.getByRole("heading", { level: 1, name: "Your own place on the water." }),
  ).toBeVisible();
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

test("verify-email without a token hands over to the pending page", async ({ page }) => {
  await page.goto("/verify-email");
  await expect(page).toHaveURL("/verify-email/pending");
  await expect(page.getByRole("heading", { level: 1, name: "Check your inbox." })).toBeVisible();
  // No email is handed over when the page is opened directly, so resend asks for it.
  await expect(page.getByLabel("Email address")).toHaveCount(0);
  await page.getByRole("button", { name: "Didn’t receive it? Resend the email" }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
});

test("pending page shows the registered address and locks resend", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "sithara-marina:pending-verification",
      JSON.stringify({ email: "guest@example.com", resendAvailableAt: Date.now() + 60_000 }),
    );
  });
  await page.goto("/verify-email/pending");
  await expect(page.getByRole("heading", { level: 1, name: "Check your inbox." })).toBeVisible();
  await expect(page.getByText("guest@example.com")).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Resend email · 00:/ })).toBeDisabled();
});

test("verify-email success page is not reachable without a session", async ({ page }) => {
  await page.goto("/verify-email/success");
  await expect(page).toHaveURL("/verify-email/pending");
  await expect(page.getByRole("heading", { name: /Welcome aboard/ })).toHaveCount(0);
});

test.describe("reset-password link", () => {
  const passwordFields = (page: import("@playwright/test").Page) =>
    page.getByLabel(/new password/i);

  /** Answers an auth endpoint without a backend and records each request body. */
  async function mockAuth(
    page: import("@playwright/test").Page,
    path: string,
    status: number,
    response: object,
  ) {
    const bodies: unknown[] = [];
    await page.route(`**${path}`, async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(response),
      });
    });
    return bodies;
  }

  test("without a link it shows the inbox and no password fields", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { level: 1, name: "Check your inbox." })).toBeVisible();
    await expect(passwordFields(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Save password/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Request a new link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to sign in" })).toBeVisible();
  });

  test("a #token link unlocks the form and saves the password", async ({ page }) => {
    const verify = await mockAuth(page, "/auth/verify-reset-link", 200, {
      reset_token: "reset.secret",
      expires_in: 600,
    });
    const save = await mockAuth(page, "/auth/reset-password", 200, {
      message: "Password updated.",
    });

    await page.goto("/reset-password#token=link.secret");
    await expect(page.getByRole("heading", { level: 1, name: "A secure return." })).toBeVisible();
    await expect(page.getByText("Choose a new password for your account.")).toBeVisible();
    await expect(page).toHaveURL("/reset-password");
    expect(verify).toEqual([{ token: "link.secret" }]);

    await page.getByLabel("New password", { exact: true }).fill("a-new-password");
    await page.getByLabel("Confirm new password").fill("a-new-password");
    await page.getByRole("button", { name: "Save password" }).click();

    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Password updated.")).toBeVisible();
    expect(save).toEqual([
      {
        reset_token: "reset.secret",
        new_password: "a-new-password",
        confirm_password: "a-new-password",
      },
    ]);
  });

  test("a ?token link is also accepted", async ({ page }) => {
    const verify = await mockAuth(page, "/auth/verify-reset-link", 200, {
      reset_token: "reset.secret",
      expires_in: 600,
    });
    await page.goto("/reset-password?token=link.secret");
    await expect(page.getByLabel("New password", { exact: true })).toBeEnabled();
    await expect(page).toHaveURL("/reset-password");
    expect(verify).toEqual([{ token: "link.secret" }]);
  });

  test("an invalid link shows no password fields and offers a way out", async ({ page }) => {
    await mockAuth(page, "/auth/verify-reset-link", 400, {
      statusCode: 400,
      code: "INVALID_TOKEN",
      message: "Invalid token",
    });
    await page.goto("/reset-password#token=link.used");
    await expect(page.getByText(/invalid or has expired/)).toBeVisible();
    await expect(passwordFields(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Request a new link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to sign in" })).toBeVisible();
  });

  test("an empty token is never sent to the backend", async ({ page }) => {
    const verify = await mockAuth(page, "/auth/verify-reset-link", 200, {
      reset_token: "reset.secret",
      expires_in: 600,
    });
    await page.goto("/reset-password#token=");
    await expect(page.getByText(/invalid or has expired/)).toBeVisible();
    await expect(passwordFields(page)).toHaveCount(0);
    expect(verify).toEqual([]);
  });

  test("a new link opened in an already-open tab is verified", async ({ page }) => {
    const verify = await mockAuth(page, "/auth/verify-reset-link", 200, {
      reset_token: "reset.secret",
      expires_in: 600,
    });
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { level: 1, name: "Check your inbox." })).toBeVisible();

    await page.evaluate(() => {
      window.location.hash = "token=link.newer";
    });
    await expect(page.getByLabel("New password", { exact: true })).toBeEnabled();
    await expect(page).toHaveURL("/reset-password");
    expect(verify).toEqual([{ token: "link.newer" }]);
  });
});

test("checkout uses the site header and fabricates no booking", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
  await expect(siteHeader(page)).toBeVisible();
  await expect(page.getByText(/confirmed/i)).toHaveCount(0);

  await page.goto("/checkout/confirmation/b-123");
  await expect(page.getByRole("heading", { level: 1, name: "Booking confirmation" })).toBeVisible();
  await expect(page.getByText(/once they’re confirmed/i)).toBeVisible();
});

test("sign-in page uses the site header and footer", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle("Sign in | Sithara Marina");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back." })).toBeVisible();
  await expect(siteHeader(page)).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  // The eye toggle reveals and hides the password without changing what was typed.
  await password.fill("fake-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("fake-password");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
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
  for (const path of ["/about", "/contact", "/terms", "/privacy", "/cancellation-policy"]) {
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

test.describe("customer account", () => {
  // Account pages need a session (checked in the browser). The account API is
  // answered here with OpenAPI-shaped data, so no backend is needed.
  test.beforeEach(async ({ page }) => {
    const empty = { items: [], total: 0, page: 1, limit: 100 };
    const answers: Record<string, unknown> = {
      "/auth/me": {
        id: "u-1",
        fullName: "Ajin Raj",
        email: "ajin@example.com",
        phone: "+919876543210",
        role: "customer",
      },
      "/me/bookings": empty,
      "/me/enquiries": empty,
    };
    await page.route(
      (url) => url.hostname !== "localhost" && url.pathname in answers,
      (route) =>
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(answers[new URL(route.request().url()).pathname]),
        }),
    );
    await page.addInitScript(() => {
      sessionStorage.setItem(
        "sithara-marina:auth-session",
        JSON.stringify({
          accessToken: `header.${btoa(JSON.stringify({ exp: 4102444800 }))}.signature`,
          refreshToken: "id.secret",
        }),
      );
    });
  });

  test("/account opens the overview inside the site layout", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL("/account");
    await expect(
      page.getByRole("heading", { level: 1, name: "Your account, thoughtfully arranged." }),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("profile page renders with account navigation and validates the name", async ({ page }) => {
    await page.goto("/account/profile");
    await expect(page).toHaveTitle("Profile details | Sithara Marina");
    await expect(
      page.getByRole("heading", { level: 1, name: "Your details, kept personal." }),
    ).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("Ajin Raj");
    await expect(page.getByRole("contentinfo")).toBeVisible();

    await page.getByLabel("Full name").fill("");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Please enter your full name.")).toBeVisible();
  });
});

test("account pages send signed-out visitors to sign in and back", async ({ page }) => {
  await page.goto("/account/profile");
  await expect(page).toHaveURL("/login?next=%2Faccount%2Fprofile");
});
