import { expect, test } from "../fixtures/test-setup.ts";

test("deleting a category that still holds products offers to move them", async ({
  page,
  api,
  unique,
}) => {
  const source = await api.createCategory(unique("Doomed"));
  const target = await api.createCategory(unique("Refuge"));
  const first = unique("Alpha");
  const second = unique("Beta");
  await api.createProduct({ categoryId: source.id, name: first });
  await api.createProduct({ categoryId: source.id, name: second });

  const cardNamed = (name: string) => page.getByRole("listitem").filter({ hasText: name });

  await page.goto("/categories");
  await expect(cardNamed(source.name)).toContainText("2 products");
  await cardNamed(source.name).getByRole("button", { name: "Delete" }).click();

  // The dialog opens on a plain confirmation; the API is not called until this
  // is clicked, and it is that call which comes back 409 and turns the dialog
  // into a move prompt.
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText(`Delete \u201C${source.name}\u201D?`);
  await dialog.getByRole("button", { name: "Delete" }).click();

  await expect(dialog).toContainText("still holds 2 products");

  await dialog.getByRole("combobox", { name: "Move products to" }).click();
  await page.getByRole("option", { name: target.name }).click();
  await dialog.getByRole("button", { name: "Move and delete" }).click();

  await expect(cardNamed(source.name)).toHaveCount(0);
  await expect(cardNamed(target.name)).toContainText("2 products");

  // The move and the delete are one transaction, so the products must have
  // arrived rather than merely stopped being listed under the old category.
  await page.goto(`/categories/${target.id}`);
  await expect(cardNamed(first)).toBeVisible();
  await expect(cardNamed(second)).toBeVisible();
});
