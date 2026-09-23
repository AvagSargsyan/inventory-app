import { expect, test } from "../fixtures/test-setup.ts";

test("card actions meet the 44px touch target floor, 8px apart", async ({ page, api, unique }) => {
  const category = await api.createCategory(unique("Touch"));
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/categories");

  const card = page.getByRole("listitem").filter({ hasText: category.name });
  const edit = await card.getByRole("link", { name: "Edit" }).boundingBox();
  const remove = await card.getByRole("button", { name: "Delete" }).boundingBox();

  expect(edit?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(remove?.height ?? 0).toBeGreaterThanOrEqual(44);

  // The tightest pair on the page; the design spec asks for 8px of separation.
  const gap = (remove?.x ?? 0) - ((edit?.x ?? 0) + (edit?.width ?? 0));
  expect(gap).toBeGreaterThanOrEqual(8);
});

test("form controls are large enough that iOS will not zoom on focus", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/categories/new");

  for (const field of [page.getByLabel("Category name"), page.getByLabel("Description")]) {
    // Below 16px, Safari zooms the page when the field takes focus.
    const fontSize = await field.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    expect(fontSize).toBeGreaterThanOrEqual(16);
  }

  const box = await page.getByLabel("Category name").boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test("a category can be created with the keyboard alone", async ({ page, api, unique }) => {
  const name = unique("Tabbed");
  // Created by clicking, so the teardown has to be told about it.
  api.trackCategoryNamed(name);
  const nameField = page.getByLabel("Category name");

  await page.goto("/categories/new");

  // Tab in from the top of the document rather than focusing the field
  // directly, which is what proves the form is actually reachable.
  for (let i = 0; i < 20; i++) {
    if (await nameField.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(nameField).toBeFocused();

  // Keyboard focus has to be visible, not just present.
  const outline = await nameField.evaluate((element) => getComputedStyle(element).outlineWidth);
  expect(Number.parseFloat(outline)).toBeGreaterThan(0);

  await page.keyboard.type(name);
  await page.keyboard.press("Tab");
  await page.keyboard.type("Typed without a mouse.");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Add category" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/categories$/);
  await expect(page.getByRole("listitem").filter({ hasText: name })).toBeVisible();
});
