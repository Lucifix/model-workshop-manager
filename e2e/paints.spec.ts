import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("can add a new paint with a new manufacturer", async ({ page }) => {
  await page.getByRole("link", { name: "Paints", exact: true }).click();
  await page.getByRole("button", { name: "+ Add paint" }).click();

  const form = page.locator("form");
  // First select is the manufacturer picker; the paint-type select comes after.
  await form.locator("select").first().selectOption("__new__");
  await form.getByPlaceholder("Manufacturer name").fill("E2E Paint Co");
  await form.getByPlaceholder("XF-1").fill("E2E-100");
  await form.getByPlaceholder("Flat Black").fill("E2E Test Paint");
  await form.getByRole("button", { name: "Save paint" }).click();

  await expect(page.getByRole("heading", { name: "E2E Test Paint" })).toBeVisible();
  await expect(page.getByText("E2E-100")).toBeVisible();

  await page.getByRole("link", { name: "Paints", exact: true }).click();
  await page.getByPlaceholder("Search paints (name or product code)…").fill("E2E Test Paint");
  await expect(page.getByText("E2E Test Paint")).toBeVisible();
});
