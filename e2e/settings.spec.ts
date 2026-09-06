import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("can change the display currency and have it persist across reloads", async ({ page }) => {
  await page.getByRole("link", { name: "Settings", exact: true }).click();

  const select = page.locator("select");
  const original = await select.inputValue();
  const next = original === "EUR" ? "GBP" : "EUR";

  await select.selectOption(next);
  const saveButton = page.getByRole("button", { name: "Save" });
  await saveButton.click();
  // The Save button re-disables itself once the saved value matches the
  // selection, confirming the mutation round-tripped.
  await expect(saveButton).toBeDisabled();

  await page.reload();
  await expect(page.locator("select")).toHaveValue(next);

  // Restore the original value so other tests relying on currency formatting
  // aren't affected.
  await page.locator("select").selectOption(original);
  await page.getByRole("button", { name: "Save" }).click();
});
