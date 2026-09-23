import { fileURLToPath } from "node:url";
import { expect, test } from "../fixtures/test-setup.ts";

const TARGET = fileURLToPath(new URL("../../docs/screenshot.png", import.meta.url));

// Its own Playwright project, running after the rest, so the grid holds the
// seeded categories rather than rows another spec is still using.
test("capture the README screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 620 });
  await page.goto("/categories");
  await page.waitForLoadState("networkidle");

  // The four seeded categories, so this fails rather than saving a picture of
  // a loading state or of another test's leftovers.
  await expect(page.getByRole("listitem")).toHaveCount(4);

  await page.screenshot({ path: TARGET, fullPage: true });
});
