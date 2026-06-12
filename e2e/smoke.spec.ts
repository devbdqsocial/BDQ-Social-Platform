import { test, expect } from "@playwright/test";
import { signIn } from "./session";

test.describe("public pages render", () => {
  test("landing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Skip to content")).toBeAttached(); // a11y skip link
  });

  test("events list", async ({ page }) => {
    await page.goto("/events");
    await expect(page.getByRole("heading", { name: /events & tickets/i })).toBeVisible();
  });

  test("event detail + accessible stall list", async ({ page }) => {
    // Drive from the list so the test doesn't depend on a specific seeded slug.
    await page.goto("/events");
    const href = await page.locator('a[href^="/events/"]').first().getAttribute("href");
    test.skip(!href, "no published event seeded");
    await page.goto(href!);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const stallList = page.getByText(/Stall list/i); // a11y map fallback (collapsed <details>)
    await expect(stallList).toBeVisible();
    await stallList.click(); // expand to reveal the keyboard hold buttons
    await expect(page.getByRole("button", { name: /Hold stall/i }).first()).toBeVisible();
  });

  test("brands", async ({ page }) => {
    await page.goto("/vendors");
    await expect(page.getByRole("heading", { name: /meet the brands/i })).toBeVisible();
  });
});

test("lead capture submits", async ({ page }) => {
  await page.goto("/vendors");
  const href = await page.locator('a[href^="/vendors/"]').first().getAttribute("href");
  const vendorId = href?.split("/").pop();
  test.skip(!vendorId, "no approved vendor seeded");

  // Free-tier Postgres drops idle connections and the first hit after a drop can render 404.
  // One warm-up request keeps the assertion meaningful — a real 404 still fails below.
  await page.request.get(`/lead/${vendorId}`).catch(() => {});
  await page.goto(`/lead/${vendorId}`);
  await page.getByLabel("Email").fill(`e2e+${Date.now()}@example.com`);
  await page.getByRole("button", { name: /share my details/i }).click();
  await expect(page.getByText(/Thanks/i)).toBeVisible();
});

test("admin ops dashboard (signed in)", async ({ context, page }) => {
  await signIn(context, "admin_seed", "SUPER_ADMIN");
  await page.goto("/admin/ops");
  await expect(page.getByRole("heading", { name: /system health/i })).toBeVisible();
});
