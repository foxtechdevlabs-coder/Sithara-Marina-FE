import { expect, test, type Page } from "@playwright/test";

// Customer authentication journeys in a real browser against a production build.
//
// MOCKED: the backend never runs here. Every /auth/* request is answered by
// `mockBackend` with a shape from the Swagger contract or observed responses, and
// an unexpected one fails the test. These prove the frontend's behaviour, not the
// backend's: real emails, tokens and refresh responses need manual verification.

const SESSION_KEY = "sithara-marina:auth-session";
const SEARCH_BAR = "Find a yacht";

test.use({ viewport: { width: 1280, height: 800 } });

/** A JWT-shaped fake token expiring `seconds` from now. */
const jwt = (name: string, seconds: number) => {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds }),
  ).toString("base64url");
  return `${name}.${payload}.signature`;
};

interface Reply {
  status?: number;
  body?: unknown;
}
type Answer = Reply | "offline" | (() => Reply | "offline" | Promise<Reply | "offline">);
interface Call {
  path: string;
  body: unknown;
  bearer: string | undefined;
}

const LOGIN_RESPONSE = {
  access_token: jwt("access", 900),
  refresh_token: "fake.refresh",
  expires_in: 900,
};

async function mockBackend(page: Page, answers: Record<string, Answer>) {
  const calls: Call[] = [];
  const unexpected: string[] = [];
  await page.route(
    (url) => url.hostname !== "localhost" && url.pathname.startsWith("/auth/"),
    async (route) => {
      const request = route.request();
      const cors = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization,content-type",
      };
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      const path = new URL(request.url()).pathname;
      calls.push({
        path,
        body: request.postDataJSON(),
        bearer: request.headers()["authorization"],
      });
      const answer = answers[path];
      if (answer === undefined) {
        unexpected.push(path);
        await route.abort();
        return;
      }
      const reply = typeof answer === "function" ? await answer() : answer;
      if (reply === "offline") {
        await route.abort();
        return;
      }
      await route.fulfill({
        status: reply.status ?? 200,
        contentType: "application/json",
        headers: cors,
        body: reply.body === undefined ? "" : JSON.stringify(reply.body),
      });
    },
  );
  return { calls, unexpected };
}

/** Starts the tab with a stored session, once: a later reload keeps what the app did to it. */
async function seedSession(page: Page, session: object | string) {
  const raw = typeof session === "string" ? session : JSON.stringify(session);
  await page.addInitScript(
    ({ key, value }) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      sessionStorage.setItem(key, value);
    },
    { key: SESSION_KEY, value: raw },
  );
}

const storedSession = (page: Page) =>
  page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY);

const signInLink = (page: Page) => page.getByRole("link", { name: "Sign in", exact: true });
const logoutButton = (page: Page) => page.getByRole("button", { name: "Logout" });
const searchBar = (page: Page) => page.getByRole("form", { name: SEARCH_BAR });
const revocationNotice = (page: Page) => page.getByText("signed out on this device");

async function submitLogin(page: Page, password = "fake-password") {
  await page.getByLabel("Email address").fill("guest@example.com");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function submitRegistration(page: Page) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Asha Menon");
  await page.getByLabel("Email address").fill("Guest@Example.com ");
  await page.getByLabel("Password", { exact: true }).fill("fake-password");
  await page.getByLabel("Confirm password").fill("fake-password");
  await page.getByRole("button", { name: /Create account/ }).click();
}

test.describe("registration", () => {
  test("a saved account goes to the pending page with the address", async ({ page }) => {
    const { calls } = await mockBackend(page, {
      "/auth/register": {
        status: 201,
        body: { user_id: "fake-id", verification_required: true },
      },
    });
    await submitRegistration(page);

    await expect(page).toHaveURL("/verify-email/pending");
    await expect(page.getByRole("heading", { level: 1, name: "Check your inbox." })).toBeVisible();
    await expect(page.getByText("guest@example.com")).toBeVisible();
    expect(calls).toEqual([
      {
        path: "/auth/register",
        body: {
          fullName: "Asha Menon",
          email: "guest@example.com",
          password: "fake-password",
          confirmPassword: "fake-password",
        },
        bearer: undefined,
      },
    ]);
    expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage }))).not.toContain(
      "fake-password",
    );
  });

  test("a failed email delivery goes to the failed page", async ({ page }) => {
    await mockBackend(page, {
      "/auth/register": {
        status: 503,
        body: { statusCode: 503, code: "EMAIL_DELIVERY_FAILED", message: "Email failed" },
      },
    });
    await submitRegistration(page);
    await expect(page).toHaveURL("/verify-email/failed");
    await expect(page.getByText("guest@example.com")).toBeVisible();
  });

  const failures: [string, Answer, RegExp][] = [
    [
      "400",
      { status: 400, body: { message: ["email must be an email"] } },
      /correct the highlighted/,
    ],
    ["409", { status: 409, body: { code: "EMAIL_EXISTS", message: "Exists" } }, /already verified/],
    [
      "429",
      { status: 429, body: { code: "RESEND_COOLDOWN", message: "Wait" } },
      /Please wait a moment before requesting another email/,
    ],
    ["500", { status: 500, body: { message: "Boom" } }, /Something went wrong/],
    ["a network failure", "offline", /connect to the Sithara Marina server/],
  ];
  for (const [name, answer, message] of failures) {
    test(`stays on the form after ${name}`, async ({ page }) => {
      await mockBackend(page, { "/auth/register": answer });
      await submitRegistration(page);
      await expect(page.getByText(message)).toBeVisible();
      await expect(page).toHaveURL("/register");
    });
  }
});

test.describe("email verification", () => {
  const verified = {
    access_token: jwt("access", 900),
    refresh_token: "fake.refresh",
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      fullName: "Asha Menon",
      email: "guest@example.com",
      role: "customer",
    },
  };

  test("a #token link signs in, shows success, then the signed-in Home", async ({ page }) => {
    const { calls } = await mockBackend(page, { "/auth/verify-email": { body: verified } });

    await page.goto("/verify-email#token=fake.link");
    await expect(page).toHaveURL("/verify-email/success");
    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome aboard, Asha." }),
    ).toBeVisible();
    expect(calls).toEqual([
      { path: "/auth/verify-email", body: { token: "fake.link" }, bearer: undefined },
    ]);

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Asha Menon").filter({ visible: true })).toBeVisible();
    await expect(logoutButton(page)).toBeVisible();
    await expect(searchBar(page)).toBeVisible();
  });

  test("an invalid link never reaches the success page", async ({ page }) => {
    await mockBackend(page, {
      "/auth/verify-email": {
        status: 400,
        body: { statusCode: 400, code: "INVALID_TOKEN", message: "Invalid token" },
      },
    });
    await page.goto("/verify-email#token=fake.used");
    await expect(page.getByText(/invalid, has expired or has already been used/)).toBeVisible();
    await expect(page).toHaveURL("/verify-email");
    expect(await storedSession(page)).toBeNull();
  });

  test("a login session does not see the verification success page", async ({ page }) => {
    await mockBackend(page, {});
    await seedSession(page, { accessToken: jwt("access", 900), refreshToken: "fake.refresh" });
    await page.goto("/verify-email/success");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /Welcome aboard/ })).toHaveCount(0);
  });
});

test.describe("login", () => {
  test("signs in and updates Home without a refresh", async ({ page }) => {
    const { calls } = await mockBackend(page, { "/auth/login": { body: LOGIN_RESPONSE } });
    await page.goto("/login");
    await expect(signInLink(page)).toBeVisible();
    await submitLogin(page);

    await expect(page).toHaveURL("/");
    await expect(logoutButton(page)).toBeVisible();
    await expect(signInLink(page)).toHaveCount(0);
    await expect(searchBar(page)).toBeVisible();
    expect(calls).toEqual([
      {
        path: "/auth/login",
        body: { email: "guest@example.com", password: "fake-password" },
        bearer: undefined,
      },
    ]);
    expect(JSON.parse((await storedSession(page)) ?? "{}")).toEqual({
      accessToken: LOGIN_RESPONSE.access_token,
      refreshToken: LOGIN_RESPONSE.refresh_token,
    });
    expect(page.url()).not.toContain("fake");
  });

  test("returns to a safe ?next= page", async ({ page }) => {
    await mockBackend(page, { "/auth/login": { body: LOGIN_RESPONSE } });
    await page.goto("/login?next=%2Fyachts%3Fguests%3D4");
    await submitLogin(page);
    await expect(page).toHaveURL("/yachts?guests=4");
  });

  for (const next of ["/\t/evil.example", "/\n/evil.example", "//evil.example"]) {
    test(`ignores the open redirect ${JSON.stringify(next)}`, async ({ page }) => {
      await mockBackend(page, { "/auth/login": { body: LOGIN_RESPONSE } });
      await page.route(
        (url) => url.hostname.endsWith("evil.example"),
        (route) => route.fulfill({ status: 200, body: "left the site" }),
      );
      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await submitLogin(page);
      await expect(page).toHaveURL("/");
    });
  }

  test("sends one request for a double submit", async ({ page }) => {
    const { calls } = await mockBackend(page, {
      "/auth/login": async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { body: LOGIN_RESPONSE };
      },
    });
    await page.goto("/login");
    await page.getByLabel("Email address").fill("guest@example.com");
    await page.getByLabel("Password").fill("fake-password");
    await page.getByLabel("Password").press("Enter");
    await page
      .getByLabel("Password")
      .press("Enter")
      .catch(() => {});
    await expect(page).toHaveURL("/");
    expect(calls).toHaveLength(1);
  });

  const failures: [string, Answer, RegExp][] = [
    ["400", { status: 400, body: { message: ["email must be an email"] } }, /check your email and/],
    ["401", { status: 401, body: { message: "Invalid email or password" } }, /incorrect/],
    ["403", { status: 403, body: { message: "Forbidden" } }, /sign you in/],
    ["404", { status: 404, body: { message: "Not found" } }, /sign you in/],
    ["429", { status: 429, body: { message: "Too many" } }, /Please wait/],
    ["500", { status: 500, body: { message: "Boom" } }, /temporarily unavailable/],
    ["a network failure", "offline", /connect to the Sithara Marina server/],
    ["a 200 with no tokens", { body: { user: {} } }, /unexpected response/],
  ];
  for (const [name, answer, message] of failures) {
    test(`stays signed out after ${name}`, async ({ page }) => {
      await mockBackend(page, { "/auth/login": answer });
      await page.goto("/login");
      await submitLogin(page);
      await expect(page.getByText(message)).toBeVisible();
      await expect(page).toHaveURL("/login");
      expect(await storedSession(page)).toBeNull();
      await expect(signInLink(page)).toBeVisible();
    });
  }
});

test.describe("password reset", () => {
  const NEUTRAL = "If an account matches the supplied email, instructions will be sent.";

  test("forgot password confirms without proving a link or revealing the account", async ({
    page,
  }) => {
    const { calls } = await mockBackend(page, {
      "/auth/forgot-password": { body: { message: NEUTRAL } },
    });
    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill("guest@example.com");
    await page.getByRole("button", { name: /Send password reset link/ }).click();

    await expect(page).toHaveURL("/reset-password");
    await expect(page.getByRole("heading", { level: 1, name: "Check your inbox." })).toBeVisible();
    await expect(page.getByText(NEUTRAL)).toBeVisible();
    await expect(page.getByLabel(/new password/i)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Back to sign in" })).toBeVisible();
    expect(calls.map((call) => call.path)).toEqual(["/auth/forgot-password"]);
  });

  for (const [name, answer, message] of [
    ["429", { status: 429, body: { code: "RESEND_COOLDOWN" } }, /Please wait/],
    ["500", { status: 500, body: {} }, /temporarily unavailable/],
    ["a network failure", "offline", /connect to the Sithara Marina server/],
  ] as [string, Answer, RegExp][]) {
    test(`forgot password stays on the form after ${name}`, async ({ page }) => {
      await mockBackend(page, { "/auth/forgot-password": answer });
      await page.goto("/forgot-password");
      await page.getByLabel("Email address").fill("guest@example.com");
      await page.getByRole("button", { name: /Send password reset link/ }).click();
      await expect(page.getByText(message)).toBeVisible();
      await expect(page).toHaveURL("/forgot-password");
    });
  }

  test("a saved password goes to login, and the new password signs in", async ({ page }) => {
    const { calls } = await mockBackend(page, {
      "/auth/verify-reset-link": { body: { reset_token: "fake.reset", expires_in: 600 } },
      "/auth/reset-password": { body: { message: "Password updated." } },
      "/auth/login": { body: LOGIN_RESPONSE },
    });
    await page.goto("/reset-password#token=fake.link");
    await page.getByLabel("New password", { exact: true }).fill("a-new-password");
    await page.getByLabel("Confirm new password").fill("a-new-password");
    await page.getByRole("button", { name: "Save password" }).click();

    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Password updated.")).toBeVisible();
    expect(await storedSession(page)).toBeNull();

    await submitLogin(page, "a-new-password");
    await expect(page).toHaveURL("/");
    await expect(logoutButton(page)).toBeVisible();
    expect(calls.at(-1)?.body).toEqual({ email: "guest@example.com", password: "a-new-password" });
  });

  test("an expired reset session hides the form again", async ({ page }) => {
    await mockBackend(page, {
      "/auth/verify-reset-link": { body: { reset_token: "fake.reset", expires_in: 600 } },
      "/auth/reset-password": {
        status: 400,
        body: { statusCode: 400, code: "INVALID_RESET_TOKEN", message: "Invalid" },
      },
    });
    await page.goto("/reset-password#token=fake.link");
    await page.getByLabel("New password", { exact: true }).fill("a-new-password");
    await page.getByLabel("Confirm new password").fill("a-new-password");
    await page.getByRole("button", { name: "Save password" }).click();

    await expect(page.getByText(/no longer valid/)).toBeVisible();
    await expect(page.getByLabel(/new password/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Request a new link" })).toBeVisible();
  });
});

test.describe("logout", () => {
  const validSession = { accessToken: jwt("access", 900), refreshToken: "fake.refresh" };

  test("a 204 clears the tokens and restores the signed-out Home", async ({ page }) => {
    const { calls } = await mockBackend(page, { "/auth/logout": { status: 204 } });
    await seedSession(page, validSession);
    await page.goto("/");
    await logoutButton(page).click();

    await expect(signInLink(page)).toBeVisible();
    await expect(searchBar(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Explore the yachts" }).first()).toBeVisible();
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0]).toEqual({
      path: "/auth/logout",
      body: { refresh_token: "fake.refresh" },
      bearer: `Bearer ${validSession.accessToken}`,
    });
    expect(await storedSession(page)).toBeNull();
    await expect(revocationNotice(page)).toHaveCount(0);

    await page.reload();
    await expect(signInLink(page)).toBeVisible();
    await expect(searchBar(page)).toHaveCount(0);
  });

  test("the header updates before the backend answers", async ({ page }) => {
    let answerLogout = () => {};
    const answered = new Promise<void>((resolve) => {
      answerLogout = resolve;
    });
    await mockBackend(page, {
      "/auth/logout": async () => {
        await answered;
        return { status: 204 };
      },
    });
    await seedSession(page, validSession);
    await page.goto("/");
    await logoutButton(page).click();

    await expect(signInLink(page)).toBeVisible();
    expect(await storedSession(page)).toBeNull();
    answerLogout();
  });

  test("an expired access token is refreshed, then the new pair is revoked", async ({ page }) => {
    const renewed = { access_token: jwt("renewed", 900), refresh_token: "fake.renewed" };
    await seedSession(page, { accessToken: jwt("old", -60), refreshToken: "fake.old" });
    let refreshes = 0;
    const { calls } = await mockBackend(page, {
      "/auth/refresh": () => {
        refreshes += 1;
        return { body: renewed };
      },
      "/auth/logout": { status: 204 },
    });
    await page.goto("/");
    await expect.poll(() => refreshes).toBe(1); // the page-load check renews it first
    await logoutButton(page).click();

    await expect(signInLink(page)).toBeVisible();
    await expect.poll(() => calls.at(-1)?.path).toBe("/auth/logout");
    expect(calls.at(-1)).toEqual({
      path: "/auth/logout",
      body: { refresh_token: "fake.renewed" },
      bearer: `Bearer ${renewed.access_token}`,
    });
  });

  test("logging out during a page-load refresh revokes the new token", async ({ page }) => {
    let finishRefresh = () => {};
    const finished = new Promise<void>((resolve) => {
      finishRefresh = resolve;
    });
    const renewed = { access_token: jwt("renewed", 900), refresh_token: "fake.renewed" };
    await seedSession(page, { accessToken: jwt("old", -60), refreshToken: "fake.old" });
    const { calls } = await mockBackend(page, {
      "/auth/refresh": async () => {
        await finished;
        return { body: renewed };
      },
      "/auth/logout": { status: 204 },
    });
    await page.goto("/");
    await expect.poll(() => calls.length).toBe(1);
    await logoutButton(page).click();
    await expect(signInLink(page)).toBeVisible();
    finishRefresh();

    await expect
      .poll(() => calls.map((call) => call.path))
      .toEqual(["/auth/refresh", "/auth/logout"]);
    expect(calls[1]?.body).toEqual({ refresh_token: "fake.renewed" });
    expect(await storedSession(page)).toBeNull();
    await expect(signInLink(page)).toBeVisible();
  });

  for (const [name, answers] of [
    ["the logout API fails", { "/auth/logout": { status: 500, body: {} } }],
    ["the logout API answers 401", { "/auth/logout": { status: 401, body: {} } }],
    ["the network fails", { "/auth/logout": "offline" }],
  ] as [string, Record<string, Answer>][]) {
    test(`stays signed out and warns when ${name}`, async ({ page }) => {
      await mockBackend(page, answers);
      await seedSession(page, validSession);
      await page.goto("/");
      await logoutButton(page).click();

      await expect(signInLink(page)).toBeVisible();
      await expect(revocationNotice(page)).toBeVisible();
      expect(await storedSession(page)).toBeNull();
      expect(page.url()).not.toContain("/login");
    });
  }

  test("the warning goes away after signing in again", async ({ page }) => {
    await mockBackend(page, {
      "/auth/logout": { status: 500, body: {} },
      "/auth/login": { body: LOGIN_RESPONSE },
    });
    await seedSession(page, validSession);
    await page.goto("/");
    await logoutButton(page).click();
    await expect(revocationNotice(page)).toBeVisible();

    await signInLink(page).click();
    await expect(page).toHaveURL("/login");
    await submitLogin(page);
    await expect(logoutButton(page)).toBeVisible();
    await expect(revocationNotice(page)).toHaveCount(0);
  });

  test("repeated login and logout leave a clean state each time", async ({ page }) => {
    const { calls } = await mockBackend(page, {
      "/auth/login": { body: LOGIN_RESPONSE },
      "/auth/logout": { status: 204 },
    });
    await page.goto("/login");
    for (let round = 1; round <= 3; round += 1) {
      await submitLogin(page);
      await expect(page).toHaveURL("/");
      await logoutButton(page).click();
      await expect(signInLink(page)).toBeVisible();
      expect(await storedSession(page)).toBeNull();
      await signInLink(page).click();
      await expect(page).toHaveURL("/login");
    }
    const paths = calls.map((call) => call.path);
    expect(paths.filter((path) => path === "/auth/login")).toHaveLength(3);
    await expect.poll(() => calls.filter((call) => call.path === "/auth/logout").length).toBe(3);
  });

  test("logging out during the redirect after login leaves the form usable", async ({ page }) => {
    await mockBackend(page, {
      "/auth/login": { body: LOGIN_RESPONSE },
      "/auth/logout": { status: 204 },
    });
    await page.route(
      (url) => url.searchParams.has("_rsc"),
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue().catch(() => {});
      },
    );
    await page.goto("/login");
    await submitLogin(page);
    await logoutButton(page).click();
    await signInLink(page).click();

    await expect(page).toHaveURL("/login");
    await expect(page.getByLabel("Email address")).toBeEnabled();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("Logout is in the Menu", async ({ page }) => {
      await mockBackend(page, { "/auth/logout": { status: 204 } });
      await seedSession(page, validSession);
      await page.goto("/");
      await page.getByRole("button", { name: "Open menu" }).click();
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("button", { name: "Logout" })
        .click();
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(
        page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Sign in" }),
      ).toBeVisible();
    });
  });
});

test.describe("restored sessions", () => {
  test("a reload keeps a valid session without calling the backend", async ({ page }) => {
    const { calls } = await mockBackend(page, {});
    await seedSession(page, { accessToken: jwt("access", 900), refreshToken: "fake.refresh" });
    await page.goto("/");
    await expect(logoutButton(page)).toBeVisible();
    await page.reload();
    await expect(logoutButton(page)).toBeVisible();
    await expect(searchBar(page)).toBeVisible();
    expect(calls).toEqual([]);
  });

  test("an expired token is renewed and stays signed in", async ({ page }) => {
    const renewed = { access_token: jwt("renewed", 900), refresh_token: "fake.renewed" };
    await mockBackend(page, { "/auth/refresh": { body: renewed } });
    await seedSession(page, { accessToken: jwt("old", -60), refreshToken: "fake.old" });
    await page.goto("/");
    await expect
      .poll(async () => JSON.parse((await storedSession(page)) ?? "{}").refreshToken)
      .toBe("fake.renewed");
    await expect(logoutButton(page)).toBeVisible();
  });

  test("an invalid refresh token signs out, without redirecting", async ({ page }) => {
    await mockBackend(page, {
      "/auth/refresh": { status: 401, body: { message: "Invalid refresh token" } },
    });
    await seedSession(page, { accessToken: jwt("old", -60), refreshToken: "fake.old" });
    await page.goto("/");
    await expect(signInLink(page)).toBeVisible();
    await expect(searchBar(page)).toHaveCount(0);
    expect(await storedSession(page)).toBeNull();
    await expect(page).toHaveURL("/");
  });

  test("a network failure keeps the session for the next attempt", async ({ page }) => {
    const { calls } = await mockBackend(page, { "/auth/refresh": "offline" });
    await seedSession(page, { accessToken: jwt("old", -60), refreshToken: "fake.old" });
    await page.goto("/");
    await expect.poll(() => calls.length).toBe(1);
    await expect(logoutButton(page)).toBeVisible();
    expect(await storedSession(page)).not.toBeNull();
  });

  test("corrupt stored data is treated as signed out", async ({ page }) => {
    await mockBackend(page, {});
    await seedSession(page, "{not json");
    await page.goto("/");
    await expect(signInLink(page)).toBeVisible();
    await expect(searchBar(page)).toHaveCount(0);
  });

  test("a reset link's token leaves the URL while other parameters stay", async ({ page }) => {
    await mockBackend(page, {
      "/auth/verify-reset-link": { body: { reset_token: "fake.reset", expires_in: 600 } },
    });
    await page.goto("/reset-password?keep=1#token=fake.link");
    await expect(page.getByLabel("New password", { exact: true })).toBeEnabled();
    await expect(page).toHaveURL("/reset-password?keep=1");
  });
});

test.describe("direct access", () => {
  test("a signed-out visitor stays on public pages, with no backend calls", async ({ page }) => {
    const { calls } = await mockBackend(page, {});
    for (const path of ["/", "/yachts", "/search", "/plan-your-charter", "/checkout"]) {
      await page.goto(path);
      await expect(page).toHaveURL(path);
    }
    expect(calls).toEqual([]);
  });

  test("the failed page hands over to pending without a registration", async ({ page }) => {
    await page.goto("/verify-email/failed");
    await expect(page).toHaveURL("/verify-email/pending");
  });

  test("a customer session does not open the admin console", async ({ page }) => {
    await mockBackend(page, {});
    await seedSession(page, { accessToken: jwt("access", 900), refreshToken: "fake.refresh" });
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("navigation", { name: "Admin" })).toHaveCount(0);
  });
});
