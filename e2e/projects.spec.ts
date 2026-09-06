import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("can start a new build with a new model and track its progress", async ({ page }) => {
  await page.getByRole("link", { name: "Builds", exact: true }).click();
  await page.getByRole("button", { name: "+ New Build" }).click();

  await page.getByRole("button", { name: "Can't find it? + Add a new model" }).click();
  const modelForm = page.locator("form");
  await modelForm.locator("select").selectOption("__new__");
  await modelForm.getByPlaceholder("Manufacturer name").fill("E2E Build Manufacturer");
  await modelForm.getByPlaceholder("05239").fill("E2E-200");
  await modelForm.getByPlaceholder("Smit Houston").fill("E2E Build Kit");
  await modelForm.getByRole("button", { name: "Save model" }).click();

  await expect(page.getByText("Building")).toBeVisible();
  const buildForm = page.locator("form");
  await buildForm.getByPlaceholder("E2E Build Kit Build").fill("E2E Test Build");
  await buildForm.getByRole("button", { name: "Start build" }).click();

  await expect(page).toHaveURL(/\/projects\/\d+/);
  await expect(page.getByRole("heading", { name: "E2E Test Build" })).toBeVisible();

  // Move the status forward and confirm it sticks.
  const statusSelect = page.locator("select").first();
  await statusSelect.selectOption("In Progress");
  await expect(statusSelect).toHaveValue("In Progress");

  // Add a build log entry.
  await page.getByRole("button", { name: "Build Log" }).click();
  await page.getByRole("button", { name: "+ Add progress" }).click();
  await page.getByPlaceholder("What did you work on?").fill("E2E log entry");
  await page.getByRole("button", { name: "Add entry" }).click();
  await expect(page.getByRole("heading", { name: "E2E log entry" })).toBeVisible();

  await page.getByRole("link", { name: "Builds", exact: true }).click();
  await expect(page.getByRole("heading", { name: "E2E Test Build" })).toBeVisible();
});
