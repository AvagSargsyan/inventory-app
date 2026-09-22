import { expect, test } from "../fixtures/test-setup.ts";

// The widths the design spec names: 320 is the real floor, 375 the comfortable
// phone, then the three breakpoints.
const WIDTHS = [320, 375, 768, 1024, 1440];

for (const width of WIDTHS) {
  test(`no route scrolls sideways at ${width}px`, async ({ page, api, unique }) => {
    // Its own rows, so the :id routes exist without depending on seed ids.
    const category = await api.createCategory(unique("Layout"));
    const product = await api.createProduct({ categoryId: category.id, name: unique("Item") });

    const routes = [
      "/",
      "/categories",
      "/categories/new",
      `/categories/${category.id}`,
      `/categories/${category.id}/edit`,
      "/products",
      "/products/new",
      `/products/${product.id}/edit`,
      "/no-such-page",
    ];

    await page.setViewportSize({ width, height: 900 });

    for (const route of routes) {
      await page.goto(route);
      // The layout is only final once the data has arrived and the skeletons
      // have gone.
      await page.waitForLoadState("networkidle");

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));

      // Soft, so one bad route does not hide the state of the other eight.
      expect.soft(scrollWidth, `${route} overflows at ${width}px`).toBeLessThanOrEqual(innerWidth);
    }
  });
}
