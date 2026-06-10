import { chromium } from "@playwright/test";
import path from "path";

async function run() {
  const artifactDir = "C:/Users/shrey/.gemini/antigravity-ide/brain/f6e8304d-1992-48a1-a889-53d9cf7ad802";
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log("Navigating to http://localhost:3000...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

  // Let the database wake up and page settle
  await page.waitForTimeout(2000);

  const targets = [
    { name: "y_0_hero", y: 0 },
    { name: "y_3200_slide2_food", y: 3200 },
    { name: "y_4400_slide3_music", y: 4400 },
    { name: "y_5600_slide4_photos", y: 5600 },
    { name: "y_7500_brands", y: 7500 },
    { name: "y_10000_footer", y: 10000 }
  ];

  for (const t of targets) {
    console.log(`Scrolling to Y = ${t.y}...`);
    await page.evaluate((scrollTarget) => {
      window.scrollTo(0, scrollTarget);
    }, t.y);
    
    // Wait for GSAP and Lenis to settle
    await page.waitForTimeout(1000);

    const scrollY = await page.evaluate(() => window.scrollY);
    const screenshotPath = path.join(artifactDir, `verify_${t.name}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Captured screenshot for Y = ${scrollY} at: ${screenshotPath}`);
  }

  await browser.close();
  console.log("Completed capture.");
}

run().catch(console.error);
