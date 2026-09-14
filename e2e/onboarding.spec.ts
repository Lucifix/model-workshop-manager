import { expect, test } from "@playwright/test";

const USERNAME = "onboarding-user";
const PASSWORD = "onboarding-password";
const NEW_PASSWORD = "onboarding-new-password";

// Serial: each test depends on the state the previous one left the one
// shared account in (no credential -> created -> password changed). Runs
// against its own server/database (see playwright.config.ts) so it can't
// affect, or be affected by, the main "chromium" project's shared session.
test.describe.serial("first-run setup and password change", () => {
  test("shows the setup screen on a fresh install, and completing it logs you in", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome to Workshop Manager" })).toBeVisible();

    await page.locator('input[autocomplete="username"]').fill(USERNAME);
    await page.locator('input[autocomplete="new-password"]').first().fill(PASSWORD);
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("heading", { name: "Workshop", exact: true })).toBeVisible();
  });

  test("setup is inert once a credential exists", async ({ page }) => {
    // A fresh, logged-out context — hitting the app fresh should now go
    // straight to the login screen, not the setup screen, since setup
    // completed in the previous test.
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Welcome to Workshop Manager" }),
    ).not.toBeVisible();
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
  });

  test("changing the password signs out other sessions", async ({ page, browser }) => {
    await page.goto("/");
    await page.locator('input[autocomplete="username"]').fill(USERNAME);
    await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("heading", { name: "Workshop", exact: true }).waitFor();

    // A second, independent browser context logged in with the same
    // still-valid credentials — this is the "other session" that changing
    // the password below should invalidate.
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await otherPage.goto("/");
    await otherPage.locator('input[autocomplete="username"]').fill(USERNAME);
    await otherPage.locator('input[autocomplete="current-password"]').fill(PASSWORD);
    await otherPage.getByRole("button", { name: "Sign in" }).click();
    await otherPage.getByRole("heading", { name: "Workshop", exact: true }).waitFor();

    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
    await page.locator('input[autocomplete="new-password"]').fill(NEW_PASSWORD);
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Update account" }).click();

    // The change-credential mutation reloads this tab itself. Waiting for
    // the Login heading specifically, not just any username-autocomplete
    // input — the Account form on this very page still has its own "New
    // username" field on screen right up until the reload completes, which
    // would make a looser selector resolve before the logout actually did.
    await page.getByRole("heading", { name: "Workshop Manager", exact: true }).waitFor();

    await otherPage.reload();
    await expect(
      otherPage.getByRole("heading", { name: "Workshop Manager", exact: true }),
    ).toBeVisible();

    await otherContext.close();

    // The new password works. Still on the /settings URL from before the
    // reload (a full page reload doesn't change it, and logging back in
    // doesn't navigate anywhere) — asserting "Sign out" is visible rather
    // than a page-specific heading, since which page renders here depends
    // on the URL, not on whether the login succeeded.
    await page.locator('input[autocomplete="username"]').fill(USERNAME);
    await page.locator('input[autocomplete="current-password"]').fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});
