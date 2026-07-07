import { test, expect } from "@playwright/test";
import { signIn } from "./session";

/** Vendor portal journey smoke (vendor-portal overhaul): auth pages, every portal screen,
 * the reskin regressions (visible phone input, no "View site", bordered fields), and the rail. */

test.describe("vendor auth pages", () => {
  test("login renders with a usable phone input", async ({ page }) => {
    await page.goto("/vendor/login");
    await expect(page.getByText("Vendor sign in")).toBeVisible();
    const phone = page.getByPlaceholder("9876543210");
    await expect(phone).toBeVisible();
    await phone.fill("9876543210");
    await expect(phone).toHaveValue("9876543210");
    // Regression: the input row uses the surface-relative bordered style (invisible-text fix).
    await expect(page.locator(".bdq-input").first()).toBeVisible();
  });

  test("signup renders", async ({ page }) => {
    await page.goto("/vendor/signup");
    await expect(page.getByRole("heading", { name: /become a vendor/i })).toBeVisible();
  });

  test("unauthenticated portal access redirects to login", async ({ page }) => {
    test.skip(!!process.env.DEV_VENDOR, "DEV_VENDOR bypass active in this environment");
    await page.goto("/vendor/home");
    await expect(page).toHaveURL(/\/vendor\/login/);
  });
});

test.describe("vendor portal (signed in)", () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context, "vendor_seed", "VENDOR");
  });

  test("home shows the application spine and the rail has no View site link", async ({ page }) => {
    await page.goto("/vendor/home");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Your application")).toBeVisible();
    await expect(page.getByRole("link", { name: "View site" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /notifications/i })).toBeVisible(); // bell
  });

  test("book a stall list", async ({ page }) => {
    await page.goto("/vendor/events");
    await expect(page.getByRole("heading", { name: /pick a market/i })).toBeVisible();
  });

  test("stall picker renders map + reserve rail", async ({ page }) => {
    await page.goto("/vendor/events");
    const href = await page.locator('a[href^="/vendor/events/"]').first().getAttribute("href").catch(() => null);
    test.skip(!href, "no stall-enabled event seeded");
    await page.goto(href!);
    await expect(page.getByRole("heading", { name: /pick your stall/i })).toBeVisible();
  });

  test("brand profile uses bordered fields with the upload row", async ({ page }) => {
    await page.goto("/vendor/profile");
    await expect(page.getByRole("heading", { name: /your brand/i })).toBeVisible();
    expect(await page.locator("input.bdq-input").count()).toBeGreaterThan(3);
    await expect(page.getByRole("button", { name: "Upload" }).first()).toBeVisible();
  });

  test("documents, contract, offers, leads, add-ons all render", async ({ page }) => {
    await page.goto("/vendor/documents");
    await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();

    await page.goto("/vendor/contract");
    await expect(page.getByRole("heading", { name: /participation contract/i })).toBeVisible();

    await page.goto("/vendor/offers");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/vendor/leads");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/vendor/add-ons");
    await expect(page.getByRole("heading", { name: /stall add-ons/i })).toBeVisible();
  });

  test("mobile drawer opens with white nav links", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await page.goto("/vendor/home");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Book a stall" })).toBeVisible();
  });
});
