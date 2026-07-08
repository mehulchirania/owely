/**
 * Mints a server-side session cookie via the Admin SDK, bypassing reCAPTCHA.
 * Steps:
 *   1. Admin SDK: create/get the test phone user → custom token
 *   2. Firebase REST API: exchange custom token → idToken
 *   3. POST /api/auth/session → session cookie
 *   4. Playwright: load cookie, screenshot all pages
 */

import { readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";

// ── CONFIG ─────────────────────────────────────────────────────────────────
const BASE = "http://localhost:3333";
const OUT  = "C:/Users/mehul/Documents/Codex/owely/screenshots";
mkdirSync(OUT, { recursive: true });

// Load env from .env.local (Next.js loads it automatically but we're outside Next)
const envRaw = readFileSync("C:/Users/mehul/Documents/Codex/owely/.env.local", "utf8");
const env = Object.fromEntries(
  envRaw.split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const API_KEY     = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const SA_B64      = env.FIREBASE_SERVICE_ACCOUNT_KEY;
const SA_JSON     = SA_B64.trim().startsWith("{") ? SA_B64 : Buffer.from(SA_B64, "base64").toString("utf8");
const SA          = JSON.parse(SA_JSON);

// ── STEP 1: ADMIN SDK → CUSTOM TOKEN ──────────────────────────────────────
const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getAuth: getAdminAuth } = await import("firebase-admin/auth");

const app = getApps().find(a => a.name === "mint") ?? initializeApp({
  credential: cert({
    projectId: SA.project_id,
    clientEmail: SA.client_email,
    privateKey: SA.private_key.replace(/\\n/g, "\n"),
  }),
}, "mint");

const adminAuth = getAdminAuth(app);

// Get or create the test phone user
const TEST_PHONE = "+919999999999";
let uid;
try {
  const u = await adminAuth.getUserByPhoneNumber(TEST_PHONE);
  uid = u.uid;
  console.log("✓ Found test user:", uid);
} catch {
  const u = await adminAuth.createUser({ phoneNumber: TEST_PHONE, displayName: "Test User" });
  uid = u.uid;
  console.log("✓ Created test user:", uid);
}

const customToken = await adminAuth.createCustomToken(uid);
console.log("✓ Custom token minted");

// ── STEP 2: EXCHANGE CUSTOM TOKEN → ID TOKEN ───────────────────────────────
const exchRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  }
);
const exchData = await exchRes.json();
if (!exchRes.ok) {
  console.error("Token exchange failed:", exchData);
  process.exit(1);
}
const idToken = exchData.idToken;
console.log("✓ ID token obtained");

// ── STEP 3: MINT SESSION COOKIE ────────────────────────────────────────────
const sessRes = await fetch(`${BASE}/api/auth/session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ idToken }),
});
if (!sessRes.ok) {
  const txt = await sessRes.text();
  console.error("Session creation failed:", sessRes.status, txt);
  process.exit(1);
}
const setCookieHeader = sessRes.headers.get("set-cookie");
if (!setCookieHeader) {
  console.error("No Set-Cookie header in session response");
  process.exit(1);
}
console.log("✓ Session cookie received");

// Parse the cookie name/value from Set-Cookie header
// Format: "name=value; Path=/; HttpOnly; ..."
const [nameValue] = setCookieHeader.split(";");
const [cookieName, ...rest] = nameValue.split("=");
const cookieValue = rest.join("="); // value may contain = signs

// ── STEP 4: PLAYWRIGHT WITH INJECTED COOKIE ────────────────────────────────
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox"],
});

const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  // Inject the session cookie for localhost
  storageState: {
    cookies: [{
      name: cookieName.trim(),
      value: cookieValue.trim(),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    }],
    origins: [],
  },
});

const page = await ctx.newPage();

// Verify auth works
await page.goto(`${BASE}/home`, { waitUntil: "domcontentloaded", timeout: 12000 });
await page.waitForTimeout(1000);
const landedAt = page.url();
if (!landedAt.includes("/home")) {
  console.error("Auth not recognized — landed at:", landedAt);
  await browser.close();
  process.exit(1);
}
console.log("✓ Authenticated in browser →", landedAt);

// ── SCREENSHOTS ─────────────────────────────────────────────────────────────
async function shot(label, url, waitFor) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  const path = join(OUT, `${label}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`  ✓ ${label}`);
}

console.log("\nCapturing pages...");
await shot("01-home",     `${BASE}/home`);
await shot("02-groups",   `${BASE}/groups`);
await shot("03-people",   `${BASE}/people`);
await shot("04-settings", `${BASE}/settings`);

// Group detail
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

await browser.close();
console.log("\nAll screenshots saved to:", OUT);
