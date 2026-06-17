/**
 * Verification script to inspect the seeded user in Auth and Firestore.
 *
 * Run with:
 *   npx ts-node --esm scripts/verify-user.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  const envPath = join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*FIREBASE_SERVICE_ACCOUNT_KEY\s*=\s*(.+?)\s*$/);
      if (match) {
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY = match[1].replace(/(^['"]|['"]$)/g, "");
      }
    }
  }
}

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not set.");
  process.exit(1);
}

const serviceAccount = JSON.parse(
  Buffer.from(serviceAccountRaw, "base64").toString("utf-8"),
);

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();
const db = getFirestore();

async function verify() {
  const phone = "+916666666666";
  try {
    const authUser = await auth.getUserByPhoneNumber(phone);
    console.log("Firebase Auth User:");
    console.log(`  UID: ${authUser.uid}`);
    console.log(`  Phone: ${authUser.phoneNumber}`);
    console.log(`  Name: ${authUser.displayName}`);

    const doc = await db.doc(`users/${authUser.uid}`).get();
    if (doc.exists) {
      console.log("\nFirestore Document (users/" + authUser.uid + "):");
      console.log(JSON.stringify(doc.data(), null, 2));
    } else {
      console.log("\nFirestore Document does not exist!");
    }
  } catch (error) {
    console.error("Error verifying:", error);
  }
}

verify().catch(console.error);
