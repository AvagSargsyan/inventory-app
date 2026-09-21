import { expect, test } from "../fixtures/test-setup.ts";

test("a rejected field shows its message and keeps what was typed", async ({ page }) => {
  const main = page.getByRole("main");
  const nameField = page.getByLabel("Category name");

  await page.goto("/categories/new");
  await nameField.fill("x");
  await page.getByLabel("Description").fill("Worth keeping.");
  await main.getByRole("button", { name: "Add category" }).click();

  await expect(main.getByText("Name must be between 2 and 60 characters.")).toBeVisible();
  // Still on the form, with the typed values intact.
  await expect(page).toHaveURL(/\/categories\/new$/);
  await expect(nameField).toHaveValue("x");
  await expect(page.getByLabel("Description")).toHaveValue("Worth keeping.");
  // Wired to the field rather than merely rendered beside it.
  await expect(nameField).toHaveAttribute("aria-invalid", "true");

  // Editing the field clears the message, which described the old value.
  await nameField.fill("Long enough");
  await expect(main.getByText("Name must be between 2 and 60 characters.")).toHaveCount(0);
});

test("a duplicate name is reported under the name field, not as a banner", async ({
  page,
  api,
  unique,
}) => {
  const existing = await api.createCategory(unique("Twin"));
  const main = page.getByRole("main");

  await page.goto("/categories/new");
  await page.getByLabel("Category name").fill(existing.name);
  await main.getByRole("button", { name: "Add category" }).click();

  // A 409 rather than a 422, but it is still a problem with one field.
  await expect(main.getByText("A category with that name already exists.")).toBeVisible();
  await expect(page.getByLabel("Category name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Category name")).toHaveValue(existing.name);
});
