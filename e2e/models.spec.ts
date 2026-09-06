import { expect, test } from "@playwright/test";
import { login } from "./login";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("can add a new model with a new manufacturer", async ({ page }) => {
  await page.getByRole("link", { name: "Models", exact: true }).click();
  await page.getByRole("button", { name: "+ Add model" }).click();

  const form = page.locator("form");
  await form.locator("select").selectOption("__new__");
  await form.getByPlaceholder("Manufacturer name").fill("E2E Test Manufacturer");
  await form.getByPlaceholder("05239").fill("E2E-001");
  await form.getByPlaceholder("Smit Houston").fill("E2E Test Kit");
  await form.getByRole("button", { name: "Save model" }).click();

  await expect(page.getByRole("heading", { name: "E2E Test Kit" })).toBeVisible();
  await expect(page.getByText("E2E-001")).toBeVisible();

  await page.getByRole("link", { name: "Models", exact: true }).click();
  await expect(page.getByText("E2E Test Kit")).toBeVisible();
});
