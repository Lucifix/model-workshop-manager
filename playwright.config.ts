import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export const E2E_USERNAME = "e2e-user";
export const E2E_PASSWORD = "e2e-password";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Runs against the dev server (Vite middleware + Express), same as `npm
  // run dev` — not a production build, to keep the suite fast. Migrates a
  // dedicated, disposable sqlite file (wiped on every run) rather than
  // touching whatever DB a contributor has running locally.
  webServer: {
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
});
