import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a PRODUCTION server.
 *
 * - Locally / in CI: run `npm run build` first; Playwright then starts
 *   `next start` on port 3100 (or reuses a server already running there).
 * - Against a deployed environment: set E2E_BASE_URL and no server is started,
 *   e.g. `E2E_BASE_URL=https://staging.example.com npm run test:e2e`.
 */
const externalBaseUrl = process.env.E2E_BASE_URL;
const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: externalBaseUrl ?? `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `npm run start -- --port ${port}`,
        url: `http://localhost:${port}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
