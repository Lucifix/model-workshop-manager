import { expect, test } from "@playwright/test";
import { login } from "./login";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("shows the workshop overview on an empty catalog", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Workshop", exact: true })).toBeVisible();
  await expect(page.getByText("What's on the bench right now.")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ New Build" })).toBeVisible();
  await expect(page.locator(".text-red-400")).toHaveCount(0);
});
