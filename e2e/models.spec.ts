import { expect, test, type Page } from "@playwright/test";

// The suite shares one database and runs in parallel, so every test uses
// its own manufacturer/kit names.
function unique(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function openAddForm(page: Page) {
  await page.getByRole("link", { name: "Models", exact: true }).click();
  await page.getByRole("button", { name: "+ Add model" }).click();
  return page.getByRole("dialog", { name: "Add a model" });
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
  await expect(form.getByText("New", { exact: true })).toBeVisible();
  await form.getByLabel("Kit number").fill("E2E-001");
  await form.getByLabel("Name", { exact: true }).fill("E2E Test Kit");
  await form.getByRole("button", { name: "Save model" }).click();

  await expect(page).toHaveURL(/\/models\/\d+$/);
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
  // Not in the catalog yet: the barcode is kept as a chip, to be saved with the kit.
  await expect(form.getByTitle("Saved with this kit")).toContainText(barcode);

  await chooseNewManufacturer(page, manufacturer);
  await form.getByLabel("Kit number").fill("BC-1");
  await form.getByLabel("Name", { exact: true }).fill("Barcode Kit");
  await form.getByRole("button", { name: "Save & add another" }).click();
  await expect(page.getByText('Added "Barcode Kit" to catalog')).toBeVisible();

  await form.getByLabel("Barcode or kit search").fill(barcode);
  await form.getByLabel("Barcode or kit search").press("Enter");
  await expect(form.getByRole("status")).toContainText("Already in your catalog: Barcode Kit");
});

test("the add form is a dialog that closes with × or Escape", async ({ page }) => {
  const dialog = await openAddForm(page);
  await expect(dialog.getByLabel("Barcode or kit search")).toBeFocused();

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "+ Add model" }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("moving on to a second kit clears the first one, barcode included", async ({ page }) => {
  // The lookup itself is mocked in the browser: this exercises the form's
  // bookkeeping, and must never spend real UPCitemdb calls.
  const suffix = String(Date.now()).slice(-8);
  const barcodeA = `40${suffix}001`;
  const barcodeB = `49${suffix}002`;
  const makerB = unique("E2E Second Maker");
  await page.route("**/api/catalog/providers", (route) =>
    route.fulfill({
      json: [
        { id: "manual", label: "Manual entry" },
        { id: "upcitemdb", label: "Barcode lookup (UPCitemdb)" },
      ],
    }),
  );
  await page.route(
    (url) => url.pathname === "/api/catalog/search",
    (route) => {
      const q = new URL(route.request().url()).searchParams.get("q");
      const results =
        q === barcodeA
          ? [
              {
                externalId: barcodeA,
                barcode: barcodeA,
                manufacturerName: unique("E2E First Maker"),
                kitNumber: "A-1",
                name: "First Kit",
                scale: "1:200",
                priceRange: { low: 39.95, high: 39.95 },
              },
            ]
          : [
              {
                externalId: barcodeB,
                barcode: barcodeB,
                barcodes: [barcodeB],
                manufacturerName: makerB,
                kitNumber: "B-2",
                name: "Second Kit",
              },
            ];
      return route.fulfill({ json: { results, quota: null } });
    },
  );

  const form = await openAddForm(page);
  const find = form.getByLabel("Barcode or kit search");

  // Kit A by barcode: matched and filled, with its price line and barcode.
  await find.fill(barcodeA);
  await find.press("Enter");
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("First Kit");
  await expect(form.getByText(/US retail/)).toBeVisible();
  await expect(form.getByTitle("Saved with this kit")).toContainText(barcodeA);

  // Moving on: a name search clears A before B's results are shown...
  await find.fill("second kit");
  await find.press("Enter");
  await expect(form.getByRole("button", { name: /Second Kit/ })).toBeVisible();
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("");
  await expect(form.getByText(/US retail/)).toBeHidden();
  await expect(form.getByTitle("Saved with this kit")).toBeHidden();

  // ...and picking B gives B's barcode, not A's.
  await form.getByRole("button", { name: /Second Kit/ }).click();
  await expect(form.getByLabel("Name", { exact: true })).toHaveValue("Second Kit");
  await expect(form.getByTitle("Saved with this kit")).toContainText(barcodeB);
  await form.getByRole("button", { name: "Save model" }).click();
  await expect(page.getByRole("heading", { name: "Second Kit" })).toBeVisible();

  const saved = await (await page.request.get(`/api/models?barcode=${barcodeB}`)).json();
  expect(saved.map((r: { model: { name: string } }) => r.model.name)).toEqual(["Second Kit"]);
  const stale = await (await page.request.get(`/api/models?barcode=${barcodeA}`)).json();
  expect(stale).toEqual([]);

  // Searching for it again flags it as already in the catalog, in the list.
  await page.getByRole("link", { name: "Models", exact: true }).click();
  await page.getByRole("button", { name: "+ Add model" }).click();
  await find.fill("second kit");
  await find.press("Enter");
  await expect(form.getByRole("button", { name: /Second Kit/ })).toContainText("In your catalog");
});
