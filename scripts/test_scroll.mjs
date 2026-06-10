import { chromium } from "@playwright/test";

async function run() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 800 });

  page.on("console", (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  page.on("pageerror", (err) => {
    console.error(`[Browser Error] ${err.message}`);
  });

  console.log("Navigating to http://localhost:3000...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

  const metrics = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const track = document.querySelector(".pinned-track");
    const slides = document.querySelectorAll(".pinned-slide");
    return {
      title: document.title,
      scrollHeight: Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight),
      trackExists: !!track,
      trackStyle: track ? getComputedStyle(track).transform : null,
      trackFlexDirection: track ? getComputedStyle(track).flexDirection : null,
      slidesCount: slides.length,
      slidesWidths: Array.from(slides).map(s => getComputedStyle(s).width),
    };
  });

  console.log("Metrics:", JSON.stringify(metrics, null, 2));

  for (let y = 0; y <= metrics.scrollHeight; y += 1000) {
    await page.evaluate((scrollTarget) => {
      window.scrollTo(0, scrollTarget);
    }, y);
    
    await page.waitForTimeout(200);

    const scrollState = await page.evaluate(() => {
      const track = document.querySelector(".pinned-track");
      return {
        scrollY: window.scrollY,
        trackTransform: track ? getComputedStyle(track).transform : null,
      };
    });

    console.log(`At Scroll Y = ${scrollState.scrollY}: trackTransform = ${scrollState.trackTransform}`);
  }

  await browser.close();
  console.log("Browser closed.");
}

run().catch(console.error);
