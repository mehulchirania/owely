/**
 * Authenticated UI check using a persistent browser profile.
 * On first run: opens headed browser, you must log in manually.
 * On subsequent runs: reuses the saved session automatically.
 */
import { chromium } from "playwright";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:3333";
const OUT = "C:/Users/mehul/Documents/Codex/owely/screenshots";
const PROFILE = "C:/Users/mehul/Documents/Codex/owely/screenshots/chrome-profile";
mkdirSync(OUT, { recursive: true });
mkdirSync(PROFILE, { recursive: true });

// Use a persistent context — survives between runs
const ctx = await chromium.launchPersistentContext(PROFILE, {
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
});

const page = ctx.pages()[0] ?? await ctx.newPage();

// ── CHECK IF ALREADY AUTHENTICATED ────────────────────────────────────────
await page.goto(`${BASE}/home`, { waitUntil: "domcontentloaded", timeout: 10000 });
await page.waitForTimeout(1500);
const alreadyIn = page.url().includes("/home");

if (!alreadyIn) {
  console.log("Not authenticated. Attempting phone login...");
  await page.goto(`${BASE}/?login=true`, { waitUntil: "domcontentloaded" });

  const phoneTabBtn = page.getByRole("button", { name: /phone/i });
  if (await phoneTabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await phoneTabBtn.click();
    await page.waitForTimeout(500);
  }

  await page.locator('input#phone, input[type="tel"]').first().fill("9999999999");
  await page.getByRole("button", { name: "Continue with phone number" }).click();

  // Wait up to 45s for reCAPTCHA + Firebase to process test number
  console.log("Waiting for reCAPTCHA and Firebase...");
  await page.waitForSelector("input#code:not([disabled])", { timeout: 45000 });
  await page.fill("input#code", "123456");
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await page.waitForURL(/\/(home|groups|onboarding)/, { timeout: 15000 });
  console.log("✓ Logged in →", page.url());
} else {
  console.log("✓ Session reused →", page.url());
}

// ── SCREENSHOT HELPER ──────────────────────────────────────────────────────
async function shot(label, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(700);
  const path = join(OUT, `${label}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`  ✓ ${label}`);
}

// ── MAIN PAGES ─────────────────────────────────────────────────────────────
console.log("\nCapturing pages...");
await shot("01-home",     `${BASE}/home`);
await shot("02-groups",   `${BASE}/groups`);
await shot("03-people",   `${BASE}/people`);
await shot("04-settings", `${BASE}/settings`);

// ── GROUP DETAIL ───────────────────────────────────────────────────────────
await page.goto(`${BASE}/groups`, { waitUntil: "networkidle", timeout: 12000 });
const firstGroupHref = await page
  .locator('a[href^="/groups/"]').first()
  .getAttribute("href").catch(() => null);

if (firstGroupHref) {
  const gBase = `${BASE}${firstGroupHref}`;
  await shot("05-group-expenses", gBase);
  await shot("06-group-balances", `${gBase}?tab=balances`);
  await shot("07-group-members",  `${gBase}?tab=members`);
} else {
  console.log("  (no groups found — skipping group detail)");
}

await ctx.close();
console.log("\nAll screenshots saved to:", OUT);
