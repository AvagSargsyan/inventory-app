import { expect, test } from "../fixtures/test-setup.ts";

test("a category with no products explains that, rather than showing an empty grid", async ({
  page,
  api,
  unique,
}) => {
  // Its own empty category rather than the seeded one, so the test does not
  // break the day the seed changes.
  const category = await api.createCategory(unique("Barren"));
  const main = page.getByRole("main");

  await page.goto(`/categories/${category.id}`);
  await expect(main.getByRole("heading", { name: category.name })).toBeVisible();
  await expect(main).toContainText("0 products");
  await expect(main.getByText("No products in this category yet.")).toBeVisible();
  await expect(main.getByRole("link", { name: "Add a product" })).toBeVisible();
});

test("a search matching nothing offers a way back out", async ({ page }) => {
  const main = page.getByRole("main");

  await page.goto("/products");
  await page.getByLabel("Search").fill("nothing-matches-this-at-all");

  await expect(main.getByText("No products match these filters.")).toBeVisible();
  // The filter is in the URL, so the view is linkable.
  await expect(page).toHaveURL(/[?&]q=nothing-matches-this-at-all/);

  await main.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(main.getByRole("listitem").first()).toBeVisible();
});

test("an unreachable API shows an error instead of an empty page", async ({ page }) => {
  // Aborting is a failed connection, not a 500: the server never answers.
  await page.route("**/api/**", (route) => route.abort());
  const main = page.getByRole("main");

  await page.goto("/categories");
  const alert = main.getByRole("alert");
  await expect(alert).toContainText("Could not load categories");
  // The client tells a dead connection apart from a server that answered badly.
  await expect(alert).toContainText("Could not reach the server.");
});

test("a category that does not exist says so", async ({ page }) => {
  const main = page.getByRole("main");

  await page.goto("/categories/99999999");
  await expect(main.getByRole("alert")).toContainText("Category not found");
  await expect(main.getByRole("link", { name: "Back to categories" })).toBeVisible();
});
