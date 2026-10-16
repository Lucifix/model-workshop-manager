import { expect, test, type Page } from "@playwright/test";

// The suite shares one database and runs in parallel, so every test uses
// its own manufacturer/kit names.
function unique(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function openAddForm(page: Page) {
  await page.getByRole("link", { name: "Models", exact: true }).click();
  await page.getByRole("button", { name: "+ Add model" }).click();
  return page.locator("form");
}

async function chooseNewManufacturer(page: Page, name: string) {
  await page.getByLabel("Manufacturer").fill(name);
  await page.getByRole("option", { name: `+ Add "${name}"` }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("can add a new model with a new manufacturer", async ({ page }) => {
  const manufacturer = unique("E2E Maker");
  const form = await openAddForm(page);

  // Only the essentials are visible up front.
  await expect(form.getByLabel("Scale")).toBeHidden();

  await chooseNewManufacturer(page, manufacturer);
  await expect(form.getByText("New manufacturer — it'll be added when you save.")).toBeVisible();
  await form.getByLabel("Kit number").fill("E2E-001");
  await form.getByLabel("Name", { exact: true }).fill("E2E Test Kit");
  await form.getByRole("button", { name: "Save model" }).click();

  await expect(page.getByRole("heading", { name: "E2E Test Kit" })).toBeVisible();
  await expect(page.getByText("E2E-001")).toBeVisible();
  // "I own this kit" is on by default.
  await expect(page.getByText("In your inventory")).toBeVisible();

  await page.getByRole("link", { name: "Models", exact: true }).click();
  await expect(page.getByRole("heading", { name: "E2E Test Kit" }).first()).toBeVisible();
});

test("normalises the scale and keeps manufacturer + scale for the next kit", async ({ page }) => {
  const manufacturer = unique("E2E Batch");
  const form = await openAddForm(page);

  await chooseNewManufacturer(page, manufacturer);
  await form.getByLabel("Kit number").fill("B-1");
  await form.getByLabel("Name", { exact: true }).fill("Batch Kit One");
  await form.getByRole("button", { name: "More details" }).click();
  await form.getByLabel("Scale").fill("1/48");
  await form.getByLabel("Category").click(); // blur commits the normalised scale
  await expect(form.getByLabel("Scale")).toHaveValue("1:48");
  await form.getByLabel("I own this kit").uncheck();
  await form.getByRole("button", { name: "Save & add another" }).click();

  await expect(page.getByText('Added "Batch Kit One" to catalog')).toBeVisible();
  await expect(form.getByLabel("Manufacturer")).toHaveValue(manufacturer);
  await expect(form.getByLabel("Kit number")).toHaveValue("");
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("");
  await form.getByRole("button", { name: "More details" }).click();
  await expect(form.getByLabel("Scale")).toHaveValue("1:48");

  // The just-used manufacturer is an existing one now, so the duplicate
  // check runs live while typing.
  await form.getByLabel("Kit number").fill("B-1");
  await expect(form.getByRole("alert")).toContainText("is already in your catalog");
});

test("remembers a typed barcode and recognises it on the next scan", async ({ page }) => {
  const manufacturer = unique("E2E Barcode");
  const barcode = `40${String(Date.now()).slice(-11)}`;
  // settings.spec.ts flips the lookup toggle on the shared server while this
  // runs in parallel — pin "lookup off" here so this test can never make a
  // real UPCitemdb call (it only exercises the local-catalog barcode check).
  await page.route("**/api/catalog/providers", (route) =>
    route.fulfill({ json: [{ id: "manual", label: "Manual entry" }] }),
  );
  const form = await openAddForm(page);

  // Online lookup is off by default: say so and point at Settings, rather
  // than hiding the barcode field.
  await expect(form.getByRole("link", { name: "Settings" })).toBeVisible();

  await form.getByLabel("Barcode or kit search").fill(barcode);
  await form.getByRole("button", { name: "Find" }).click();
  await expect(form.getByRole("status")).toContainText("Not in your catalog yet");
  await expect(form.getByText(`Barcode ${barcode} will be saved with this kit.`)).toBeVisible();

  await chooseNewManufacturer(page, manufacturer);
  await form.getByLabel("Kit number").fill("BC-1");
  await form.getByLabel("Name", { exact: true }).fill("Barcode Kit");
  await form.getByRole("button", { name: "Save & add another" }).click();
  await expect(page.getByText('Added "Barcode Kit" to catalog')).toBeVisible();

  await form.getByLabel("Barcode or kit search").fill(barcode);
  await form.getByLabel("Barcode or kit search").press("Enter");
  await expect(form.getByRole("status")).toContainText("Already in your catalog: Barcode Kit");
});
