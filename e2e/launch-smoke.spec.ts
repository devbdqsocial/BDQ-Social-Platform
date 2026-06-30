import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./session";

async function expectPageOk(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBeLessThan(500);
  await expect(page.locator("body")).toBeVisible();
}

test.describe("launch smoke", () => {
  for (const path of ["/", "/events", "/map", "/vendors"]) {
    test(`public ${path}`, async ({ page }) => {
      await expectPageOk(page, path);
    });
  }

  test("customer tickets redirect to login when signed out", async ({ page }) => {
    await page.goto("/tickets");
    await expect(page).toHaveURL(/\/login\?next=\/tickets/);
  });

  test("vendor home loads with seeded session when available", async ({ context, page }) => {
    test.skip(!process.env.SESSION_SECRET, "SESSION_SECRET is required to mint a session");
    await signIn(context, "vendor_seed", "VENDOR");
    await expectPageOk(page, "/vendor/home");
  });

  test("admin events load with seeded session when available", async ({ context, page }) => {
    test.skip(!process.env.SESSION_SECRET, "SESSION_SECRET is required to mint a session");
    await signIn(context, "admin_seed", "SUPER_ADMIN");
    await expectPageOk(page, "/admin/events");
  });

  test("staff scanner shell loads with seeded admin session when available", async ({ context, page }) => {
    test.skip(!process.env.SESSION_SECRET, "SESSION_SECRET is required to mint a session");
    await signIn(context, "admin_seed", "SUPER_ADMIN");
    await expectPageOk(page, "/admin/ops/checkin");
  });
});
