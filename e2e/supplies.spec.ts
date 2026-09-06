import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("can add a supply, adjust its quantity, and remove it", async ({ page }) => {
  await page.getByRole("link", { name: "Supplies", exact: true }).click();
  await page.getByRole("button", { name: "+ Add supply" }).click();

  const form = page.locator("form");
  await form.getByPlaceholder("e.g. Tamiya Extra Thin Cement").fill("E2E Test Supply");
  await form.getByRole("button", { name: "Add" }).click();

  const row = page.locator(".rounded-2xl").filter({ hasText: "E2E Test Supply" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Increase quantity" }).click();
  await expect(row.getByText("2", { exact: true })).toBeVisible();

  await row.getByRole("button", { name: "Remove" }).click();
  await expect(row).not.toBeVisible();
});
