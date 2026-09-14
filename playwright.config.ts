import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// A second, fully isolated server + database for tests that need to start
// from a genuinely credential-less boot (the setup wizard) or that mutate
// the one shared account (changing its password) — either would otherwise
// corrupt the main "chromium" project's shared logged-in session, since
// every test there reuses the same storageState cookie against the same
// single-row credential table.
const ONBOARDING_PORT = 3101;
const ONBOARDING_BASE_URL = `http://localhost:${ONBOARDING_PORT}`;

export const E2E_USERNAME = "e2e-user";
export const E2E_PASSWORD = "e2e-password";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  // The dev server transforms each module on first request — the very
  // first page load of a run pays that cost on top of normal actions, so
  // give it more room than Playwright's 30s default.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // Playwright's bundled Chromium build won't run on macOS 13 (Ventura).
    // Set PLAYWRIGHT_CHROME_CHANNEL=chrome in your local shell to fall
    // back to the system Chrome install instead — CI and other machines
    // keep using the bundled build by default.
    channel: process.env.PLAYWRIGHT_CHROME_CHANNEL,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts|onboarding\.spec\.ts/,
    },
    // No storageState override — starts every test genuinely logged out,
    // against ONBOARDING_BASE_URL's separate server (see webServer below).
    {
      name: "onboarding",
      use: { ...devices["Desktop Chrome"], baseURL: ONBOARDING_BASE_URL },
      testMatch: /onboarding\.spec\.ts/,
    },
  ],

  // Runs against the dev server (Vite middleware + Express), same as `npm
  // run dev` — not a production build, to keep the suite fast. Migrates a
  // dedicated, disposable sqlite file (wiped on every run) rather than
  // touching whatever DB a contributor has running locally.
  webServer: [
    {
      command: "rm -f data/database/e2e-test.db* && npm run db:migrate && npm run dev",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: String(PORT),
        DATABASE_URL: "./data/database/e2e-test.db",
        AUTH_USERNAME: E2E_USERNAME,
        AUTH_PASSWORD: E2E_PASSWORD,
        SESSION_SECRET: "e2e-test-session-secret-not-for-production-use",
        SESSION_COOKIE_SECURE: "false",
      },
    },
    {
      command: "rm -f data/database/e2e-onboarding-test.db* && npm run db:migrate && npm run dev",
      url: ONBOARDING_BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: String(ONBOARDING_PORT),
        DATABASE_URL: "./data/database/e2e-onboarding-test.db",
        // Explicitly empty, not just omitted — Node's --env-file-if-exists
        // (see server.js) only fills in a var that's entirely absent from
        // the environment, so an empty string here stops it from silently
        // picking up a real AUTH_USERNAME/AUTH_PASSWORD from a contributor's
        // own .env file and defeating the point of this server.
        AUTH_USERNAME: "",
        AUTH_PASSWORD: "",
        SESSION_SECRET: "e2e-onboarding-test-session-secret-not-for-production-use",
        SESSION_COOKIE_SECURE: "false",
      },
    },
  ],
});
