import { expect, test, type Page } from "@playwright/test";

// Email rate limits and same-tab auth navigation in a real browser. MOCKED: the
// backend never runs and no email is sent. The live backend does not yet expose
// Retry-After to browsers, so `expose: true` shows the behaviour once it does.

const SIGNUP_COOLDOWN = "Please wait a moment before requesting another email.";
const SIGNUP_HOURLY =
  "You have exceeded the hourly limit for verification emails. Please check your spam folder or try again in a bit.";
const RESET_HOURLY =
  "You have exceeded the hourly limit for password reset emails. Please check your spam folder or try again in a bit.";
const RESEND_LINK = "Didn’t receive it? Resend the email";

interface Throttle {
  code?: string;
  retryAfter?: string;
  expose?: boolean;
}

/** Answers one /auth/* path, recording each request body. */
async function mockEmailEndpoint(
  page: Page,
  path: string,
  answer: () => { status: number; body: unknown; throttle?: Throttle },
) {
  const bodies: unknown[] = [];
  await page.route(
    (url) => url.hostname !== "localhost" && url.pathname === path,
    async (route) => {
      const cors = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
      };
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      bodies.push(route.request().postDataJSON());
      const { status, body, throttle } = answer();
      await route.fulfill({
        status,
        contentType: "application/json",
        headers: {
          ...cors,
          ...(throttle?.retryAfter === undefined ? {} : { "retry-after": throttle.retryAfter }),
          ...(throttle?.expose ? { "access-control-expose-headers": "Retry-After" } : {}),
        },
        body: JSON.stringify(body),
      });
    },
  );
  return bodies;
}

const tooMany = (throttle: Throttle) => () => ({
  status: 429,
  body: { statusCode: 429, code: throttle.code, message: "Slow down" },
  throttle,
});

/** The Check your inbox page for a registered address with no cooldown running. */
async function openPending(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    sessionStorage.setItem(
      "sithara-marina:pending-verification",
      JSON.stringify({ email: "guest@example.com" }),
    );
  });
  await page.goto("/verify-email/pending");
  await expect(page.getByText("guest@example.com")).toBeVisible();
}

async function submitRegistration(page: Page) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Asha Menon");
  await page.getByLabel("Email address").fill("guest@example.com");
  await page.getByLabel("Password", { exact: true }).fill("fake-password");
  await page.getByLabel("Confirm password").fill("fake-password");
  await page.getByRole("button", { name: /Create account/ }).click();
}

async function submitForgotPassword(page: Page) {
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill("guest@example.com");
  await page.getByRole("button", { name: /Send password reset link/ }).click();
}

test.describe("resend on the Check your inbox page", () => {
  test("a successful resend starts the 60 second countdown", async ({ page }) => {
    const sent = await mockEmailEndpoint(page, "/auth/resend-verification", () => ({
      status: 200,
      body: { accepted: true },
    }));
    await openPending(page);
    await page.getByRole("button", { name: RESEND_LINK }).click();

    await expect(page.getByRole("button", { name: /Resend email · 00:(60|5\d)/ })).toBeDisabled();
    expect(sent).toEqual([{ email: "guest@example.com" }]);
  });

  test("RESEND_COOLDOWN uses the exact Retry-After value", async ({ page }) => {
    await mockEmailEndpoint(
      page,
      "/auth/resend-verification",
      tooMany({ code: "RESEND_COOLDOWN", retryAfter: "37", expose: true }),
    );
    await openPending(page);
    await page.getByRole("button", { name: RESEND_LINK }).click();

    await expect(page.getByText(SIGNUP_COOLDOWN, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Resend email · 00:3[4-7]/ })).toBeDisabled();
  });

  test("TOO_MANY_EMAILS uses the exact Retry-After value", async ({ page }) => {
    await mockEmailEndpoint(
      page,
      "/auth/resend-verification",
      tooMany({ code: "TOO_MANY_EMAILS", retryAfter: "1800", expose: true }),
    );
    await openPending(page);
    await page.getByRole("button", { name: RESEND_LINK }).click();

    await expect(page.getByText(SIGNUP_HOURLY, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Resend email · (30:00|29:5\d)/ }),
    ).toBeDisabled();
  });

  for (const [name, throttle] of [
    ["hidden by CORS, as on the live backend", { retryAfter: "37" }],
    ["invalid", { retryAfter: "soon", expose: true }],
    ["missing", { expose: true }],
  ] as [string, Throttle][]) {
    test(`a ${name} Retry-After shows no invented countdown`, async ({ page }) => {
      await mockEmailEndpoint(
        page,
        "/auth/resend-verification",
        tooMany({ code: "RESEND_COOLDOWN", ...throttle }),
      );
      await openPending(page);
      await page.getByRole("button", { name: RESEND_LINK }).click();

      await expect(page.getByText(SIGNUP_COOLDOWN, { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: RESEND_LINK })).toBeEnabled();
      await expect(page.getByText(/Resend email ·/)).toHaveCount(0);
    });
  }

  test("a 429 with an unknown code still gets the cooldown message", async ({ page }) => {
    await mockEmailEndpoint(
      page,
      "/auth/resend-verification",
      tooMany({ retryAfter: "20", expose: true }),
    );
    await openPending(page);
    await page.getByRole("button", { name: RESEND_LINK }).click();

    await expect(page.getByText(SIGNUP_COOLDOWN, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Resend email · 00:(20|1\d)/ })).toBeDisabled();
  });

  test("the button comes back when the countdown reaches zero", async ({ page }) => {
    await mockEmailEndpoint(
      page,
      "/auth/resend-verification",
      tooMany({ code: "RESEND_COOLDOWN", retryAfter: "2", expose: true }),
    );
    await openPending(page);
    await page.getByRole("button", { name: RESEND_LINK }).click();

    await expect(page.getByRole("button", { name: /Resend email · 00:0/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: RESEND_LINK })).toBeEnabled({ timeout: 6_000 });
  });

  test("a double click sends one request", async ({ page }) => {
    const sent = await mockEmailEndpoint(page, "/auth/resend-verification", () => ({
      status: 200,
      body: { accepted: true },
    }));
    await openPending(page);
    await page.getByRole("button", { name: RESEND_LINK }).dblclick();

    await expect(page.getByRole("button", { name: /Resend email ·/ })).toBeDisabled();
    expect(sent).toHaveLength(1);
  });

  test("leaving during a countdown raises no errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mockEmailEndpoint(page, "/auth/resend-verification", () => ({
      status: 200,
      body: { accepted: true },
    }));
    await openPending(page);
    await page.getByRole("button", { name: RESEND_LINK }).click();
    await expect(page.getByRole("button", { name: /Resend email ·/ })).toBeDisabled();

    await page.getByRole("link", { name: "Back to sign in" }).click();
    await expect(page).toHaveURL("/login");
    await page.waitForTimeout(1_500);
    expect(errors).toEqual([]);
  });
});

test.describe("registration shares the signup cooldown", () => {
  test("a successful registration starts the same countdown as resend", async ({ page }) => {
    await mockEmailEndpoint(page, "/auth/register", () => ({
      status: 201,
      body: { user_id: "fake-id", verification_required: true },
    }));
    await submitRegistration(page);

    await expect(page).toHaveURL("/verify-email/pending");
    await expect(page.getByRole("button", { name: /Resend email · 00:(60|5\d)/ })).toBeDisabled();
  });

  test("a 429 locks registration and carries over to the resend button", async ({ page }) => {
    const sent = await mockEmailEndpoint(
      page,
      "/auth/register",
      tooMany({ code: "RESEND_COOLDOWN", retryAfter: "42", expose: true }),
    );
    await submitRegistration(page);

    await expect(page.getByText(SIGNUP_COOLDOWN)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Create account · 00:(4[0-2]|3\d)/ }),
    ).toBeDisabled();
    expect(sent).toHaveLength(1);

    await page.getByRole("button", { name: "Go to email verification" }).click();
    await expect(page).toHaveURL("/verify-email/pending");
    await expect(
      page.getByRole("button", { name: /Resend email · 00:(4[0-2]|3\d)/ }),
    ).toBeDisabled();
  });

  test("the hourly limit shows the exact message", async ({ page }) => {
    await mockEmailEndpoint(
      page,
      "/auth/register",
      tooMany({ code: "TOO_MANY_EMAILS", retryAfter: "1800", expose: true }),
    );
    await submitRegistration(page);

    await expect(page.getByText(SIGNUP_HOURLY)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Create account · (30:00|29:5\d)/ }),
    ).toBeDisabled();
  });

  test("a hidden Retry-After leaves the form usable, with no invented wait", async ({ page }) => {
    await mockEmailEndpoint(
      page,
      "/auth/register",
      tooMany({ code: "RESEND_COOLDOWN", retryAfter: "42" }),
    );
    await submitRegistration(page);

    await expect(page.getByText(SIGNUP_COOLDOWN)).toBeVisible();
    await expect(page.getByRole("button", { name: /Create account & verify email/ })).toBeEnabled();
  });

  test("another address is not held back", async ({ page }) => {
    await mockEmailEndpoint(
      page,
      "/auth/register",
      tooMany({ code: "RESEND_COOLDOWN", retryAfter: "42", expose: true }),
    );
    await submitRegistration(page);
    await expect(page.getByRole("button", { name: /Create account ·/ })).toBeDisabled();

    await page.getByLabel("Email address").fill("someone-else@example.com");
    await expect(page.getByRole("button", { name: /Create account & verify email/ })).toBeEnabled();
  });
});

test.describe("password reset has its own limit", () => {
  test("RESEND_COOLDOWN uses the exact Retry-After value", async ({ page }) => {
    await mockEmailEndpoint(
      page,
      "/auth/forgot-password",
      tooMany({ code: "RESEND_COOLDOWN", retryAfter: "37", expose: true }),
    );
    await submitForgotPassword(page);

    await expect(page.getByText(SIGNUP_COOLDOWN, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send link · 00:3[4-7]/ })).toBeDisabled();
  });

  test("the hourly limit has reset-specific wording", async ({ page }) => {
    await mockEmailEndpoint(
      page,
      "/auth/forgot-password",
      tooMany({ code: "TOO_MANY_EMAILS", retryAfter: "1800", expose: true }),
    );
    await submitForgotPassword(page);

    await expect(page.getByText(RESET_HOURLY, { exact: true })).toBeVisible();
    await expect(page.getByText(SIGNUP_HOURLY)).toHaveCount(0);
  });

  test("a hidden Retry-After shows no invented wait", async ({ page }) => {
    await mockEmailEndpoint(
      page,
      "/auth/forgot-password",
      tooMany({ code: "RESEND_COOLDOWN", retryAfter: "37" }),
    );
    await submitForgotPassword(page);

    await expect(page.getByText(SIGNUP_COOLDOWN, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send password reset link/ })).toBeEnabled();
  });

  test("a reset cooldown does not lock the signup resend", async ({ page }) => {
    await mockEmailEndpoint(
      page,
      "/auth/forgot-password",
      tooMany({ code: "RESEND_COOLDOWN", retryAfter: "37", expose: true }),
    );
    await submitForgotPassword(page);
    await expect(page.getByRole("button", { name: /Send link ·/ })).toBeDisabled();

    await openPending(page);
    await expect(page.getByRole("button", { name: RESEND_LINK })).toBeEnabled();
  });

  test("a signup cooldown does not lock forgot password", async ({ page }) => {
    await mockEmailEndpoint(page, "/auth/resend-verification", () => ({
      status: 200,
      body: { accepted: true },
    }));
    await openPending(page);
    await page.getByRole("button", { name: RESEND_LINK }).click();
    await expect(page.getByRole("button", { name: /Resend email ·/ })).toBeDisabled();

    await page.getByRole("link", { name: "Back to sign in" }).click();
    await page.goto("/forgot-password");
    await expect(page.getByRole("button", { name: /Send password reset link/ })).toBeEnabled();
  });

  test("Request a new link uses Retry-After and never guesses", async ({ page }) => {
    const throttle: Throttle = { code: "RESEND_COOLDOWN", expose: true };
    await mockEmailEndpoint(page, "/auth/forgot-password", () => tooMany(throttle)());
    await page.addInitScript(() => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      sessionStorage.setItem(
        "sithara-marina:pending-password-reset",
        JSON.stringify({ email: "guest@example.com" }),
      );
    });
    await page.goto("/reset-password");
    const requestLink = page.getByRole("button", { name: "Request a new link" });

    await requestLink.click();
    await expect(page.getByText(SIGNUP_COOLDOWN, { exact: true })).toBeVisible();
    await expect(requestLink).toBeEnabled();

    throttle.retryAfter = "37";
    await requestLink.click();
    await expect(page.getByRole("button", { name: /New link · 00:3[4-7]/ })).toBeDisabled();
  });
});

test.describe("auth navigation stays in the tab", () => {
  const verified = {
    access_token: "fake.access.token",
    refresh_token: "fake.refresh",
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      fullName: "Asha Menon",
      email: "guest@example.com",
      role: "customer",
    },
  };

  test("verification replaces its history entries and opens no tab", async ({ page, context }) => {
    await mockEmailEndpoint(page, "/auth/verify-email", () => ({ status: 200, body: verified }));
    await page.goto("/login");
    await page.goto("/verify-email#token=fake.link");
    await expect(page).toHaveURL("/verify-email/success");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL("/account/setup");
    expect(context.pages()).toHaveLength(1);

    await page.goBack();
    await expect(page).toHaveURL("/login");
  });

  test("a saved password replaces its history entry and opens no tab", async ({
    page,
    context,
  }) => {
    await mockEmailEndpoint(page, "/auth/verify-reset-link", () => ({
      status: 200,
      body: { reset_token: "fake.reset", expires_in: 600 },
    }));
    await mockEmailEndpoint(page, "/auth/reset-password", () => ({
      status: 200,
      body: { message: "Password updated." },
    }));
    await page.goto("/register");
    await page.goto("/reset-password#token=fake.link");
    await page.getByLabel("New password", { exact: true }).fill("a-new-password");
    await page.getByLabel("Confirm new password").fill("a-new-password");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page).toHaveURL("/login");
    expect(context.pages()).toHaveLength(1);

    await page.goBack();
    await expect(page).toHaveURL("/register");
  });
});
