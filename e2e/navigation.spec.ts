import { expect, test } from "@playwright/test";

const sections = [
  "Models",
  "Paints",
  "Builds",
  "Shopping List",
  "Wishlist",
  "Supplies",
  "Import & Export",
  "Settings",
];

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

for (const label of sections) {
  test(`${label} loads without an error banner`, async ({ page }) => {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page.locator(".text-red-400")).toHaveCount(0);
  });
}
