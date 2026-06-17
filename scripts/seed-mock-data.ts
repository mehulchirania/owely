/**
 * Seed script: creates demo users for +918888888888 (Rohan), +919999999999 (Aarav),
 * and +917777777777 (Aditi). It then establishes direct and group relationships,
 * populating test expenses and pre-simplified debts.
 *
 * Run with:
 *   npx ts-node --esm scripts/seed-mock-data.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";

// Load from .env.local if not already set in environment
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
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment or .env.local");
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

// Helper to generate direct group ID
function directPairKey(a: string, b: string): string {
  return [a, b].sort().join("__");
}

function directGroupIdForPair(pairKey: string): string {
  return `direct_${createHash("sha256").update(pairKey).digest("hex").slice(0, 32)}`;
}

interface UserSeed {
  phone: string;
  name: string;
}

const USERS: Record<string, UserSeed> = {
  rohan: { phone: "+918888888888", name: "Rohan Kumar" },
  aarav: { phone: "+919999999999", name: "Aarav Sharma" },
  aditi: { phone: "+917777777777", name: "Aditi Patel" },
};

async function getOrCreateUser(phone: string, displayName: string): Promise<string> {
  let uid: string;
  try {
    const existing = await auth.getUserByPhoneNumber(phone);
    uid = existing.uid;
    console.log(`Auth user exists: ${phone} -> ${uid}`);
  } catch {
    const created = await auth.createUser({
      phoneNumber: phone,
      displayName: displayName,
    });
    uid = created.uid;
    console.log(`Created Auth user: ${phone} -> ${uid}`);
  }

  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) {
    await userRef.set({
      uid,
      displayName,
      email: null,
      phone,
      photoURL: null,
      tier: "free",
      currency: "INR",
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`Firestore document created for: ${displayName}`);
  }
  return uid;
}

async function seed() {
  console.log("Seeding started...");

  // 1. Create the three users
  const uidRohan = await getOrCreateUser(USERS.rohan.phone, USERS.rohan.name);
  const uidAarav = await getOrCreateUser(USERS.aarav.phone, USERS.aarav.name);
  const uidAditi = await getOrCreateUser(USERS.aditi.phone, USERS.aditi.name);

  // 2. Create 1:1 direct relationship between Rohan and Aarav
  const pairKey = directPairKey(uidRohan, uidAarav);
  const directGroupId = directGroupIdForPair(pairKey);
  const directGroupRef = db.doc(`groups/${directGroupId}`);

  console.log(`Setting up 1:1 Direct relationship: ${directGroupId}`);
  await directGroupRef.set({
    type: "direct",
    name: `${USERS.rohan.name} + ${USERS.aarav.name}`,
    createdBy: uidRohan,
    members: [uidRohan, uidAarav],
    memberDetails: {
      [uidRohan]: { name: USERS.rohan.name, phone: USERS.rohan.phone, photoURL: null },
      [uidAarav]: { name: USERS.aarav.name, phone: USERS.aarav.phone, photoURL: null },
    },
    directPairKey: pairKey,
    directPeerUids: {
      [uidRohan]: uidAarav,
      [uidAarav]: uidRohan,
    },
    simplifiedDebts: [
      {
        id: "direct_transfer_rohan_aarav",
        from: uidRohan,
        to: uidAarav,
        amount: 22500, // Rohan owes Aarav 225 INR
        groupId: directGroupId,
        status: "pending",
        createdAt: Date.now(),
      },
    ],
    baseCurrency: "INR",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Direct expenses subcollection
  // Expense 1: Rohan paid 150 INR for Coffee. Splits: 75 INR Rohan, 75 INR Aarav.
  const expDirect1Ref = directGroupRef.collection("expenses").doc("exp_direct_coffee");
  await expDirect1Ref.set({
    groupId: directGroupId,
    title: "Coffee split",
    amount: 15000,
    currency: "INR",
    paidBy: uidRohan,
    splits: {
      [uidRohan]: 7500,
      [uidAarav]: 7500,
    },
    category: "food",
    createdBy: uidRohan,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Expense 2: Aarav paid 600 INR for Lunch. Splits: 300 INR Rohan, 300 INR Aarav.
  const expDirect2Ref = directGroupRef.collection("expenses").doc("exp_direct_lunch");
  await expDirect2Ref.set({
    groupId: directGroupId,
    title: "Lunch date",
    amount: 60000,
    currency: "INR",
    paidBy: uidAarav,
    splits: {
      [uidRohan]: 30000,
      [uidAarav]: 30000,
    },
    category: "food",
    createdBy: uidAarav,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log("Direct relationship seeded successfully.");

  // 3. Create standard group "Goa Trip 🏖️" for all three users
  const standardGroupId = "group_goa_trip";
  const standardGroupRef = db.doc(`groups/${standardGroupId}`);

  console.log(`Setting up standard group: ${standardGroupId}`);
  await standardGroupRef.set({
    type: "group",
    name: "Goa Trip 🏖️",
    createdBy: uidRohan,
    members: [uidRohan, uidAarav, uidAditi],
    memberDetails: {
      [uidRohan]: { name: USERS.rohan.name, phone: USERS.rohan.phone, photoURL: null },
      [uidAarav]: { name: USERS.aarav.name, phone: USERS.aarav.phone, photoURL: null },
      [uidAditi]: { name: USERS.aditi.name, phone: USERS.aditi.phone, photoURL: null },
    },
    simplifiedDebts: [
      {
        id: "goa_transfer_aarav_rohan",
        from: uidAarav,
        to: uidRohan,
        amount: 90000, // Aarav owes Rohan 900 INR
        groupId: standardGroupId,
        status: "pending",
        createdAt: Date.now(),
      },
      {
        id: "goa_transfer_aditi_rohan",
        from: uidAditi,
        to: uidRohan,
        amount: 30000, // Aditi owes Rohan 300 INR
        groupId: standardGroupId,
        status: "pending",
        createdAt: Date.now(),
      },
    ],
    baseCurrency: "INR",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Standard group expenses subcollection
  // Expense 1: Rohan paid 3000 INR for Airbnb booking. Splits: 1000 INR each.
  const expGroup1Ref = standardGroupRef.collection("expenses").doc("exp_goa_airbnb");
  await expGroup1Ref.set({
    groupId: standardGroupId,
    title: "Airbnb booking",
    amount: 300000,
    currency: "INR",
    paidBy: uidRohan,
    splits: {
      [uidRohan]: 100000,
      [uidAarav]: 100000,
      [uidAditi]: 100000,
    },
    category: "rent",
    createdBy: uidRohan,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Expense 2: Aditi paid 1500 INR for Cab fare. Splits: 500 INR each.
  const expGroup2Ref = standardGroupRef.collection("expenses").doc("exp_goa_cab");
  await expGroup2Ref.set({
    groupId: standardGroupId,
    title: "Cab to beach",
    amount: 150000,
    currency: "INR",
    paidBy: uidAditi,
    splits: {
      [uidRohan]: 50000,
      [uidAarav]: 50000,
      [uidAditi]: 50000,
    },
    category: "utilities",
    createdBy: uidAditi,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Expense 3: Aarav paid 900 INR for Beach snacks. Splits: 300 INR each.
  const expGroup3Ref = standardGroupRef.collection("expenses").doc("exp_goa_snacks");
  await expGroup3Ref.set({
    groupId: standardGroupId,
    title: "Beach snacks & drinks",
    amount: 90000,
    currency: "INR",
    paidBy: uidAarav,
    splits: {
      [uidRohan]: 30000,
      [uidAarav]: 30000,
      [uidAditi]: 30000,
    },
    category: "food",
    createdBy: uidAarav,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log("Standard group Goa Trip seeded successfully.");
  console.log("\nDone! Seeding completed successfully. Test credentials:");
  console.log(`  Rohan : ${USERS.rohan.phone} (OTP: 123456)`);
  console.log(`  Aarav : ${USERS.aarav.phone} (OTP: 123456)`);
  console.log(`  Aditi : ${USERS.aditi.phone} (OTP: 123456)`);
}

seed().catch((e) => {
  console.error("Seeding error:", e);
  process.exit(1);
});
