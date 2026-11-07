import { expect, test, type Page } from "@playwright/test";

// Yacht pages against tests/e2e/support/mock-yacht-api.mjs. MOCKED: all data is
// fake. Pages fetch on the server too, so the app must be started with
// NEXT_PUBLIC_API_URL pointing at the mock, and E2E_MOCK_API_URL set here.

const MOCK_API = process.env.E2E_MOCK_API_URL ?? "";

test.skip(!MOCK_API, "Needs the mock yacht API: set E2E_MOCK_API_URL");

const apiRequests = async (page: Page): Promise<string[]> =>
  (await page.request.get(`${MOCK_API}/__requests`)).json();

/** Page content. A failed font stylesheet leaves a hidden streamed copy outside <main>. */
const main = (page: Page) => page.getByRole("main");

const noHorizontalOverflow = async (page: Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);

const setGuests = async (page: Page, guests: number) => {
  for (let added = 0; added < guests; added += 1) {
    await page.getByRole("button", { name: "More: guests" }).click();
  }
};

test.beforeEach(async ({ page }) => {
  await page.request.get(`${MOCK_API}/__reset`);
});

test.describe("listing", () => {
  test("shows backend yachts, in metres, with the slug in each link", async ({ page }) => {
    await page.goto("/yachts");
    const first = page.getByRole("article").filter({ hasText: "Test Yacht 01" });
    await expect(first.getByText("28 metres")).toBeVisible(); // 92 ft
    await expect(first.getByText("12 guests")).toBeVisible();
    await expect(first.getByRole("link", { name: "Discover Test Yacht 01" })).toHaveAttribute(
      "href",
      "/yachts/test-yacht-01",
    );
    await expect(page.getByRole("article")).toHaveCount(20);
    await noHorizontalOverflow(page);
  });

  test("cards show the total, and starting prices converted from paise", async ({ page }) => {
    await page.goto("/yachts");
    await expect(main(page).getByText("Showing 20 of 22 yachts.")).toBeVisible();
    const first = page.getByRole("article").filter({ hasText: "Test Yacht 01" });
    await expect(first.getByText("₹ 46,000")).toBeVisible(); // 46,00,000 paise
    await expect(first.getByText("Starting from · excl. GST")).toBeVisible();
    await expect(main(page).getByText("per day")).toHaveCount(0);

    const sparse = page.getByRole("article").filter({ hasText: "Test Yacht 02" });
    await expect(sparse.getByText("Price on request")).toBeVisible();
    await expect(sparse.getByText("Starting from · excl. GST")).toHaveCount(0);
  });

  test("first and last pages disable Previous and Next", async ({ page }) => {
    const pages = page.getByRole("navigation", { name: "Yacht pages" });
    await page.goto("/yachts");
    await expect(pages.getByText("Previous")).toHaveAttribute("aria-disabled", "true");
    await expect(pages.getByRole("link", { name: "Next" })).toBeVisible();

    await page.goto("/yachts?page=2");
    await expect(pages.getByText("Next")).toHaveAttribute("aria-disabled", "true");
    await expect(pages.getByRole("link", { name: "Previous" })).toBeVisible();
  });

  test("keeps the applied filters visible", async ({ page }) => {
    await page.goto("/yachts?region=Kochi&guests=4&sort=price-desc");
    await expect(
      main(page).getByText("Kochi · 4+ guests · Price: High to Low"),
    ).toBeVisible();
    await expect(main(page).getByRole("link", { name: "Edit filters" })).toHaveAttribute(
      "href",
      "/search?region=Kochi&guests=4&sort=price-desc",
    );
  });

  test("says when a preference cannot be filtered, and never sends it", async ({ page }) => {
    await page.goto("/yachts?duration=Half+day&amenities=Sun+deck&region=Kochi");
    await expect(main(page).getByText(/don’t narrow these results yet/)).toBeVisible();
    const sent = await apiRequests(page);
    expect(sent.some((url) => url.includes("destination=Kochi"))).toBe(true);
    expect(sent.some((url) => /duration|amenities/.test(url))).toBe(false);
  });

  test("an invalid filter keeps a way back to the selections", async ({ page }) => {
    await page.goto("/yachts?region=Kochi&date=2000-01-01");
    await expect(main(page).getByRole("link", { name: "Edit your filters" })).toHaveAttribute(
      "href",
      "/search?region=Kochi&date=2000-01-01",
    );
  });

  test("changing filters returns to page 1", async ({ page }) => {
    await page.goto("/yachts?region=Kochi&guests=4&page=2");
    await main(page).getByRole("link", { name: "Edit filters" }).click();
    await page.getByLabel("Region").selectOption("Alleppey");
    await page.getByRole("button", { name: /^Show \d+ yachts?/ }).click();
    await expect(page).toHaveURL("/yachts?region=Alleppey&guests=4");
  });

  test("leaves out null fields instead of printing them", async ({ page }) => {
    await page.goto("/yachts");
    const sparse = page.getByRole("article").filter({ hasText: "Test Yacht 02" });
    await expect(sparse.getByText("12 guests")).toBeVisible();
    await expect(sparse.getByText("metres")).toHaveCount(0);
    await expect(sparse.getByRole("img")).toHaveCount(0);
    await expect(main(page).getByText(/null|undefined|NaN/)).toHaveCount(0);
  });

  test("paginates with the backend's page and total", async ({ page }) => {
    await page.goto("/yachts");
    const pages = page.getByRole("navigation", { name: "Yacht pages" });
    await expect(pages.getByText("Page 1 of 2")).toBeVisible();

    await pages.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL("/yachts?page=2");
    await expect(pages.getByText("Page 2 of 2")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(2);

    await pages.getByRole("link", { name: "Previous" }).click();
    await expect(page).toHaveURL("/yachts");
  });

  test("keeps filters across pages and sends the API's parameter names", async ({ page }) => {
    await page.goto("/yachts?region=Kochi&sort=price-desc&guests=4");
    await expect(main(page).getByText(/Showing \d+ of 11 yachts/)).toBeVisible();
    const sent = await apiRequests(page);
    expect(
      sent.some(
        (url) =>
          url.includes("destination=Kochi") &&
          url.includes("sort=price_desc") &&
          url.includes("guests=4"),
      ),
    ).toBe(true);
  });

  test("shows the empty, invalid-filter and failure states", async ({ page }) => {
    await page.goto("/yachts?guests=99");
    await expect(main(page).getByText(/No yachts match every filter/)).toBeVisible();

    await page.goto("/yachts?date=2000-01-01");
    await expect(main(page).getByText(/couldn’t search with those filters/)).toBeVisible();

    await page.goto("/yachts?type=broken");
    await expect(main(page).getByText(/couldn’t load our yachts/)).toBeVisible();
  });

  test("a searched date marks yachts without removing them", async ({ page }) => {
    await page.goto("/yachts?date=2030-01-15");
    await expect(page.getByRole("article")).toHaveCount(20);
    await expect(main(page).getByText("Available on your date").first()).toBeVisible();
    await expect(main(page).getByText("Not available on your date").first()).toBeVisible();
  });
});

test.describe("filters", () => {
  test("options come from the backend, and price bands stay in paise", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("radio", { name: "Motor yacht" })).toBeVisible();
    await expect(page.getByLabel("Region").getByRole("option", { name: "Alleppey" })).toHaveCount(1);
    await page.getByLabel("Region").selectOption("Kochi");
    await expect(page.getByRole("button", { name: "Show 11 yachts" })).toBeEnabled();

    const price = page.getByLabel("Price range");
    await expect(price.getByRole("option", { name: /^₹ 46,000 – / })).toHaveCount(1);
    await price.selectOption({ index: 1 });
    await page.getByRole("button", { name: /^Show \d+ yachts?/ }).click();

    await expect(page).toHaveURL(/\/yachts\?region=Kochi&min_price=4600000&max_price=\d+/);
    const sent = await apiRequests(page);
    expect(sent.some((url) => url.includes("min_price=4600000"))).toBe(true);
  });

  test("no matches disables the submit button", async ({ page }) => {
    await page.goto("/search?guests=99");
    await expect(page.getByRole("button", { name: "No yachts match" })).toBeDisabled();
  });
});

test.describe("detail", () => {
  test("shows the real yacht, converted price and new sections", async ({ page }) => {
    await page.goto("/yachts/test-yacht-01");
    await expect(page).toHaveTitle("Test Yacht 01 | Sithara Marina");
    await expect(page.getByRole("heading", { level: 1, name: "Test Yacht 01" })).toBeVisible();
    await expect(main(page).getByText("₹ 46,000", { exact: true })).toBeVisible(); // 46,00,000 paise
    await expect(main(page).getByText("Starting from · excl. GST")).toBeVisible();
    await expect(main(page).getByText("per day")).toHaveCount(0);
    for (const text of ["Test inclusion", "Test Jetty A", "Test Captain", "Test amenity"]) {
      await expect(main(page).getByText(text, { exact: true })).toBeVisible();
    }
    await expect(main(page).getByText(/Test policy line one/)).toBeVisible();
    await noHorizontalOverflow(page);

    await page.getByRole("link", { name: "Check availability" }).click();
    await expect(page).toHaveURL("/yachts/test-yacht-01#reserve");
    await expect(page.getByRole("heading", { name: "Choose your dates." })).toBeVisible();
  });

  test("shows photos in sort order", async ({ page }) => {
    await page.goto("/yachts/test-yacht-01");
    await expect(page.getByRole("img", { name: "Test Yacht 01, photo 1" }).first()).toHaveAttribute(
      "src",
      "/images/home/about-mission.jpg",
    );
  });

  test("copes with a yacht whose optional fields are all empty", async ({ page }) => {
    await page.goto("/yachts/test-yacht-02");
    await expect(main(page).getByText("Price on request")).toBeVisible();
    await expect(main(page).getByText("Your crew.")).toHaveCount(0);
    await expect(main(page).getByText(/Enquire about/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Check availability" })).toBeVisible();
    await expect(main(page).getByText(/null|undefined|NaN/)).toHaveCount(0);
  });

  // loading.tsx starts a streamed 200, so Next.js marks the not-found page noindex instead.
  for (const path of ["/yachts/no-such-yacht", "/yachts/no-such-yacht/availability"]) {
    test(`${path} shows the not-found page`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
      await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    });
  }
});

test.describe("availability", () => {
  const openDate = async (page: Page) => {
    await page.goto("/yachts/test-yacht-01/availability");
    await page.getByRole("button", { name: /Available$/ }).first().click();
    await page.getByRole("button", { name: /4 hours/ }).click();
    await expect(page.getByLabel("Start time")).toBeVisible();
  };

  test("the calendar enables only dates the API offers", async ({ page }) => {
    await page.goto("/yachts/test-yacht-01/availability");
    await expect(page.getByRole("heading", { level: 1, name: "Check availability" })).toBeVisible();
    await expect(page.getByRole("button", { name: /: Past$/ }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: /: Unavailable$/ }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: /: Partly available$/ }).first()).toBeEnabled();
    await expect(main(page).getByText(/Asia\/Kolkata/)).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test("packages come from open slots, with a time input and no list of times", async ({ page }) => {
    await openDate(page);
    await expect(page.getByRole("button", { name: /4 hours/ })).toHaveAttribute("aria-pressed", "true");
    await expect(main(page).getByText("From ₹ 45,000 · excl. GST")).toBeVisible();
    await expect(main(page).getByText(/₹ 2,000 per extra guest/)).toBeVisible();
    await expect(page.getByLabel("Start time")).toHaveAttribute("type", "time");
    await expect(page.getByRole("button", { name: "10:00 am" })).toHaveCount(0);
    await noHorizontalOverflow(page);
  });

  test("choosing a date logs no errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("ERR_NAME_NOT_RESOLVED")) {
        errors.push(message.text());
      }
    });
    await openDate(page);
    expect(errors).toEqual([]);
  });

  test("guests refetch slots; a duration filters the calendar, not the slots", async ({ page }) => {
    await openDate(page);
    await setGuests(page, 10);
    await expect(main(page).getByText("From ₹ 49,000 · excl. GST")).toBeVisible();
    const sent = await apiRequests(page);
    expect(sent.some((url) => url.includes("/slots") && url.includes("guests=10"))).toBe(true);
    expect(sent.some((url) => url.includes("/slots") && url.includes("slot_type_id"))).toBe(false);
    expect(sent.some((url) => url.includes("/calendar") && url.includes("slot_type_id"))).toBe(true);
  });

  test("handles GUESTS_EXCEED_CAPACITY", async ({ page }) => {
    await openDate(page);
    await setGuests(page, 11);
    await expect(main(page).getByText("That’s more guests than this yacht can take.")).toBeVisible();
    await page.getByRole("button", { name: "Fewer: guests" }).click();
    await expect(main(page).getByText("From ₹ 49,000 · excl. GST")).toBeVisible();
  });

  test("changing month fetches that month", async ({ page }) => {
    await page.goto("/yachts/test-yacht-01/availability");
    await expect(page.getByRole("button", { name: /: Past$/ }).first()).toBeVisible();
    await page.getByRole("button", { name: "Next month" }).click();
    // Distinct requests: development StrictMode repeats the first one, then aborts it.
    await expect
      .poll(
        async () =>
          new Set((await apiRequests(page)).filter((url) => url.includes("/calendar"))).size,
      )
      .toBe(3); // two months are shown, so one more is needed
  });

  test("shows add-ons in rupees", async ({ page }) => {
    await page.goto("/yachts/test-yacht-01/availability");
    await expect(main(page).getByText("Test add-on", { exact: true })).toBeVisible();
    await expect(main(page).getByText("₹ 2,500 · excl. GST")).toBeVisible();
    await expect(main(page).getByText("Quantity 1 to 3")).toBeVisible();
  });

  test("a failed calendar request offers a retry", async ({ page }) => {
    let fail = true;
    await page.route("**/calendar**", (route) => (fail ? route.abort() : route.continue()));
    await page.goto("/yachts/test-yacht-01/availability");
    await expect(main(page).getByText("We couldn’t load the calendar just now.")).toBeVisible();
    fail = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("button", { name: /: Past$/ }).first()).toBeVisible();
  });
});
