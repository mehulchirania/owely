/**
 * One-time seed script: creates a Firebase Auth user for +918888888888
 * and writes the matching users/{uid} Firestore document.
 *
 * Run with:
 *   npx ts-node --esm scripts/seed-test-user.ts
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY in the environment (same as the app).
 */

// Env is loaded via --env-file=.env.local in the run command.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountRaw) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env.local");
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

const PHONE = "+918888888888";
const DISPLAY_NAME = "Demo User";

async function seed() {
  let uid: string;

  // Create or fetch the Firebase Auth user
  try {
    const existing = await auth.getUserByPhoneNumber(PHONE);
    uid = existing.uid;
    console.log(`Auth user already exists — uid: ${uid}`);
  } catch {
    const created = await auth.createUser({
      phoneNumber: PHONE,
      displayName: DISPLAY_NAME,
    });
    uid = created.uid;
    console.log(`Created Auth user — uid: ${uid}`);
  }

  // Upsert the Firestore users/{uid} document
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();

  if (snap.exists) {
    console.log("Firestore document already exists — skipping write.");
  } else {
    await userRef.set({
      uid,
      displayName: DISPLAY_NAME,
      email: null,
      phone: PHONE,
      photoURL: null,
      tier: "free",
      currency: "INR",
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`Firestore users/${uid} created.`);
  }

  console.log("\nDone. Test credentials:");
  console.log(`  Phone : ${PHONE}`);
  console.log("  OTP   : 123456  (must be added as a test number in Firebase Console)");
  console.log("  UID   :", uid);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
