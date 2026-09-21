import { fileURLToPath } from "node:url";
import { expect, test } from "../fixtures/test-setup.ts";

const IMAGE = fileURLToPath(new URL("../fixtures/product.png", import.meta.url));

test("an uploaded product image is stored and served back", async ({ page, api, unique }) => {
  const category = await api.createCategory(unique("Imagery"));
  const name = unique("Photogenic");
  const main = page.getByRole("main");

  await page.goto("/products/new");
  await page.getByLabel("Product name").fill(name);
  await page.getByLabel("Price").fill("10.00");
  await page.getByLabel("Stock quantity").fill("1");
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: category.name }).click();
  await page.getByLabel("Image").setInputFiles(IMAGE);

  // Shown from a local object URL, before anything has been uploaded.
  await expect(main.getByAltText("Selected image preview")).toBeVisible();

  await main.getByRole("button", { name: "Add product" }).click();
  await expect(page).toHaveURL(/\/products$/);

  const image = page.getByRole("listitem").filter({ hasText: name }).getByRole("img", { name });
  await expect(image).toBeVisible();

  // A generated path under /uploads, never the name the file had locally.
  const src = await image.getAttribute("src");
  expect(src).toContain("/uploads/");
  expect(src).not.toContain("product.png");

  // naturalWidth stays 0 unless the browser actually fetched and decoded it,
  // so this fails if the row points at a file the API cannot serve.
  await expect
    .poll(() =>
      // The locator resolves to the <img>; the cast is what gives naturalWidth.
      image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBe(160);
});
