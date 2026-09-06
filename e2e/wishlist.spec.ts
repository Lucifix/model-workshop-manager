import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("can add a wishlist item and move it to the shopping list", async ({ page }) => {
  await page.getByRole("link", { name: "Wishlist", exact: true }).click();
  await page.getByRole("button", { name: "+ Add item" }).click();

  const form = page.locator("form");
  await form
    .getByPlaceholder("e.g. Tamiya XF-1 Flat Black, or a new airbrush")
    .fill("E2E Wishlist Item");
  await form.getByRole("button", { name: "Add" }).click();

  const row = page.locator(".rounded-2xl").filter({ hasText: "E2E Wishlist Item" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "→ Shopping list" }).click();
  await expect(row).not.toBeVisible();

  await page.getByRole("link", { name: "Shopping List", exact: true }).click();
  await expect(page.getByText("E2E Wishlist Item")).toBeVisible();
});

test("can remove a wishlist item", async ({ page }) => {
  await page.getByRole("link", { name: "Wishlist", exact: true }).click();
  await page.getByRole("button", { name: "+ Add item" }).click();

  const form = page.locator("form");
  await form
    .getByPlaceholder("e.g. Tamiya XF-1 Flat Black, or a new airbrush")
    .fill("E2E Wishlist Removable");
  await form.getByRole("button", { name: "Add" }).click();

  const row = page.locator(".rounded-2xl").filter({ hasText: "E2E Wishlist Removable" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Remove" }).click();
  await expect(row).not.toBeVisible();
});
