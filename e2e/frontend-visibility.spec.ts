import { test, expect } from "@playwright/test";

// P0.6 — Frontend visibility harness. Guards the public chrome that lint/typecheck can't see:
//  - P0.2 header colour modes: the dark heroes wire data-header-mode="light" (cream text + backplate
//    scrim), light intros wire "dark" (navy text, no scrim). We assert SectionColorSync activates them.
//  - P0.1/P0.3 menu layering + state: menu opens above the page, sets html[data-menu-open], the
//    custom cursor (when mounted) stacks above the menu, and it closes cleanly.
//  - P0.4/P0.7 footer: legal links present, final-sale copy gone.
// Contrast nuances over the FestivalScene image still need a manual screenshot pass.

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const backplateOpacity = (page: import("@playwright/test").Page) =>
  page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--header-backplate-opacity").trim(),
  );

test.describe("public chrome visibility", () => {
  test("dark landing hero activates the light header mode + backplate (P0.2)", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "BDQ." }).first()).toBeVisible();
    // SectionColorSync runs post-hydration; poll until it writes the hero's mode.
    await expect.poll(() => backplateOpacity(page)).toBe("0.2");
    // header stays present after scrolling into the hero
    await page.mouse.wheel(0, 600);
    await expect(page.getByRole("link", { name: "BDQ." }).first()).toBeVisible();
  });

  test("light intro page uses the dark header mode, no backplate (P0.2)", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/guide");
    await expect.poll(() => backplateOpacity(page)).toBe("0");
    await expect(page.getByRole("link", { name: "BDQ." }).first()).toBeVisible();
  });

  test("menu opens above the page, toggles menu-open state, and closes (P0.1/P0.3)", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/");

    const overlay = page.locator("#menu-overlay");
    // Scope to the overlay — the footer also has an "Events & tickets" link.
    const menuLink = overlay.getByRole("link", { name: /Events & tickets/i });

    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(overlay).toHaveAttribute("aria-hidden", "false");
    await expect(menuLink).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-menu-open", "true");

    // The custom cursor, when it mounts (pointer-fine, no reduced motion), must stack above the menu.
    const order = await page.evaluate(() => {
      const m = document.getElementById("mouse");
      const ov = document.getElementById("menu-overlay");
      if (!m || !ov) return null;
      return { cursor: Number(getComputedStyle(m).zIndex), menu: Number(getComputedStyle(ov).zIndex) };
    });
    if (order) expect(order.cursor).toBeGreaterThan(order.menu);

    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(overlay).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("html")).not.toHaveAttribute("data-menu-open", "true");
  });

  test("footer exposes legal links and drops final-sale copy (P0.4/P0.7)", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator('a[href="/privacy"]').first()).toBeVisible();
    await expect(footer.locator('a[href="/terms"]').first()).toBeVisible();
    await expect(page.getByText(/All sales are final/i)).toHaveCount(0);
  });
});

// P6.2 — mobile responsive guard: no unexpected horizontal document overflow on key public routes.
// (Inner overflow-x-auto strips like the brand carousel clip, so they don't inflate document width.)
// 390 is the modern mobile baseline → strict. 320 (near-extinct) is fluid-clamp/marquee-transform
// prone, so allow a small artifact margin there while still catching gross (tens-of-px) overflow.
const NARROW = [
  { name: "320", width: 320, height: 720, tol: 24 },
  { name: "390", width: 390, height: 844, tol: 1 },
];
const ROUTES = ["/", "/events", "/vendors", "/map", "/schedule", "/offers", "/gallery", "/guide", "/coming-soon"];

test.describe("no horizontal overflow on mobile (P6.2)", () => {
  for (const vp of NARROW) {
    for (const route of ROUTES) {
      test(`${route} @ ${vp.name}px`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route);
        const overflow = await page.evaluate(() => {
          const d = document.documentElement;
          return d.scrollWidth - d.clientWidth;
        });
        expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(vp.tol);
      });
    }
  }
});
