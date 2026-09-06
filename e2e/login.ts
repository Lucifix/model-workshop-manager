import type { Page } from "@playwright/test";
import { E2E_PASSWORD, E2E_USERNAME } from "../playwright.config";

export async function login(page: Page) {
  await page.goto("/");
  await page.locator('input[autocomplete="username"]').fill(E2E_USERNAME);
  await page.locator('input[autocomplete="current-password"]').fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // exact: true — the login page itself has a "Workshop Manager" heading,
  // which a substring match against "Workshop" would match prematurely.
  await page.getByRole("heading", { name: "Workshop", exact: true }).waitFor();
}
