import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERNAME } from "../playwright.config";

test("shows an error for invalid credentials", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[autocomplete="username"]').fill(E2E_USERNAME);
  await page.locator('input[autocomplete="current-password"]').fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Invalid username or password.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workshop", exact: true })).not.toBeVisible();
});

test("logs in with valid credentials and reaches the dashboard", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[autocomplete="username"]').fill(E2E_USERNAME);
  await page.locator('input[autocomplete="current-password"]').fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Workshop", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Models" })).toBeVisible();
});
