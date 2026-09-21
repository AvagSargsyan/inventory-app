import { expect, test } from "../fixtures/test-setup.ts";

test("a product can be created, edited and deleted from the UI", async ({ page, api, unique }) => {
  // Its own category, so the test does not depend on what the seed contains.
  const category = await api.createCategory(unique("Journey"));
  const created = unique("Gizmo");
  const renamed = unique("Doohickey");

  const main = page.getByRole("main");
  const cardNamed = (name: string) => page.getByRole("listitem").filter({ hasText: name });

  await page.goto("/products");
  await main.getByRole("link", { name: "Add Product" }).click();

  await page.getByLabel("Product name").fill(created);
  await page.getByLabel("Price").fill("24.99");
  await page.getByLabel("Stock quantity").fill("7");
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: category.name }).click();
  await main.getByRole("button", { name: "Add product" }).click();

  await expect(page).toHaveURL(/\/products$/);
  const card = cardNamed(created);
  await expect(card).toBeVisible();
  // 24.99 was sent as a decimal string, stored as 2499 cents, and formatted back.
  await expect(card).toContainText("$24.99");
  await expect(card).toContainText("7 in stock");
  await expect(card).toContainText(category.name);

  await card.getByRole("link", { name: "Edit" }).click();

  await expect(page.getByLabel("Product name")).toHaveValue(created);
  await expect(page.getByLabel("Price")).toHaveValue("24.99");
  await page.getByLabel("Product name").fill(renamed);
  await main.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(/\/products$/);
  await expect(cardNamed(renamed)).toBeVisible();
  await expect(cardNamed(created)).toHaveCount(0);

  await cardNamed(renamed).getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText(renamed);
  await dialog.getByRole("button", { name: "Delete" }).click();

  await expect(cardNamed(renamed)).toHaveCount(0);
});
