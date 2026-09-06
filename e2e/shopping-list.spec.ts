import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("can add a shopping list item and mark it purchased", async ({ page }) => {
  await page.getByRole("link", { name: "Shopping List", exact: true }).click();
  await page.getByRole("button", { name: "+ Add item" }).click();

  const form = page.locator("form");
  await form
    .getByPlaceholder("e.g. Tamiya XF-1 Flat Black, or a new hobby knife")
    .fill("E2E Shopping Item");
  await form.getByRole("button", { name: "Add" }).click();

  const row = page.locator(".rounded-2xl").filter({ hasText: "E2E Shopping Item" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "✓ Done" }).click();

  await expect(page.locator(".line-through", { hasText: "E2E Shopping Item" })).toBeVisible();
});
