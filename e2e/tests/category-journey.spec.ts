import { expect, test } from "../fixtures/test-setup.ts";

test("a category can be created, edited and deleted from the UI", async ({ page, unique }) => {
  const created = unique("Gadgets");
  // A second name rather than a suffix: "X renamed" still contains "X", so the
  // final "it is gone" assertion would keep matching the renamed card.
  const renamed = unique("Gizmos");

  // The header carries its own "Add Category", so every page-level lookup is
  // scoped to <main>.
  const main = page.getByRole("main");
  const cardNamed = (name: string) => page.getByRole("listitem").filter({ hasText: name });

  await page.goto("/categories");
  await main.getByRole("link", { name: "Add Category" }).click();

  await page.getByLabel("Category name").fill(created);
  await page.getByLabel("Description").fill("Things that beep.");
  await main.getByRole("button", { name: "Add category" }).click();

  await expect(page).toHaveURL(/\/categories$/);
  await expect(cardNamed(created)).toBeVisible();
  await expect(cardNamed(created)).toContainText("0 products");

  await cardNamed(created).getByRole("link", { name: "Edit" }).click();

  // The edit form is filled from the server, not from what the test typed.
  await expect(page.getByLabel("Category name")).toHaveValue(created);
  await page.getByLabel("Category name").fill(renamed);
  await main.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(/\/categories$/);
  await expect(cardNamed(renamed)).toBeVisible();
  await expect(cardNamed(created)).toHaveCount(0);

  await cardNamed(renamed).getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText(renamed);
  await dialog.getByRole("button", { name: "Delete" }).click();

  await expect(cardNamed(renamed)).toHaveCount(0);
});
