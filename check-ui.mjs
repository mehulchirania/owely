/**
 * Quick UI smoke-check: screenshot the landing page + auth-gated pages
 * using the locally installed Chrome.
 */
import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:3333";
const OUT = "C:/Users/mehul/Documents/Codex/owely/screenshots";

// ensure output dir
import { mkdirSync } from "fs";
try { mkdirSync(OUT, { recursive: true }); } catch {}

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 14-ish
  deviceScaleFactor: 2,
});

const page = await ctx.newPage();

async function shot(name, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`✓ ${name} → ${path} (${page.url()})`);
}

// 1. Landing page (public)
await shot("01-landing", `${BASE}/`);

// 2. Try navigating to /home — should redirect to /?login=true
await shot("02-home-redirect", `${BASE}/home`);

// 3. Groups redirect
await shot("03-groups-redirect", `${BASE}/groups`);

await browser.close();
console.log("\nDone. Screenshots saved to:", OUT);
