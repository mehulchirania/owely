/**
 * Seed script: creates a Pro User for +916666666666 (OTP: 123456)
 * and sets up a shared group "Pro Trip 🚀" with Rohan, Aarav, and Aditi.
 *
 * Run with:
 *   npx ts-node --esm scripts/seed-pro-user.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

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

interface UserSeed {
  phone: string;
  name: string;
  tier: "free" | "paid";
}

const USERS: Record<string, UserSeed> = {
  pro: { phone: "+916666666666", name: "Pro Tester", tier: "paid" },
  rohan: { phone: "+918888888888", name: "Rohan Kumar", tier: "free" },
  aarav: { phone: "+919999999999", name: "Aarav Sharma", tier: "free" },
  aditi: { phone: "+917777777777", name: "Aditi Patel", tier: "free" },
};

async function getOrCreateUser(phone: string, displayName: string, tier: "free" | "paid"): Promise<string> {
  let uid: string;
  try {
    const existing = await auth.getUserByPhoneNumber(phone);
    uid = existing.uid;
    await auth.updateUser(uid, {
      displayName: displayName,
    });
    console.log(`Auth user exists and updated: ${phone} -> ${uid} (${displayName})`);
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
      tier,
      currency: "INR",
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`Firestore document created for: ${displayName} (${tier})`);
  } else {
    // Make sure details are fully updated if they exist
    await userRef.update({
      tier,
      displayName,
      phone,
    });
    console.log(`Updated Firestore document details for: ${displayName} (${tier})`);
  }
  return uid;
}

interface SeedSettlement {
  id: string;
  groupId: string;
  from: string;
  to: string;
  amount: number;
  status: "pending" | "completed";
  createdAt: number;
}

// Simple greedy debt simplifier for the script
function simplifyNetBalances(
  net: Record<string, number>,
  groupId: string,
): SeedSettlement[] {
  const creditors: Array<{ uid: string; amount: number }> = [];
  const debtors: Array<{ uid: string; amount: number }> = [];
  for (const [uid, balance] of Object.entries(net)) {
    if (balance > 0) {
      creditors.push({ uid, amount: balance });
    } else if (balance < 0) {
      debtors.push({ uid, amount: -balance });
    }
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: SeedSettlement[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const transfer = Math.min(creditor.amount, debtor.amount);

    if (transfer > 0) {
      settlements.push({
        id: randomUUID(),
        groupId,
        from: debtor.uid,
        to: creditor.uid,
        amount: transfer,
        status: "pending",
        createdAt: Date.now(),
      });
    }

    creditor.amount -= transfer;
    debtor.amount -= transfer;
    if (creditor.amount <= 0) ci++;
    if (debtor.amount <= 0) di++;
  }

  return settlements;
}

async function seed() {
  console.log("Seeding Pro User and mock expenses...");

  // 1. Create/fetch the users
  const uidPro = await getOrCreateUser(USERS.pro.phone, USERS.pro.name, USERS.pro.tier);
  const uidRohan = await getOrCreateUser(USERS.rohan.phone, USERS.rohan.name, USERS.rohan.tier);
  const uidAarav = await getOrCreateUser(USERS.aarav.phone, USERS.aarav.name, USERS.aarav.tier);
  const uidAditi = await getOrCreateUser(USERS.aditi.phone, USERS.aditi.name, USERS.aditi.tier);

  // 2. Create the group "Pro Trip 🚀"
  const groupId = "group_pro_trip";
  const groupRef = db.doc(`groups/${groupId}`);

  console.log(`Setting up standard group: ${groupId}`);

  // Define expenses in paise (1 INR = 100 paise)
  // Expense 1: Pro User paid 12000 paise (₹120) for "Premium Resort". Split equally (3000 paise each).
  // Expense 2: Aarav paid 4000 paise (₹40) for "Car Rental". Split equally (1000 paise each).
  const expenses = [
    {
      id: "exp_pro_resort",
      title: "Premium Resort 🏨",
      amount: 12000,
      paidBy: uidPro,
      splits: {
        [uidPro]: 3000,
        [uidRohan]: 3000,
        [uidAarav]: 3000,
        [uidAditi]: 3000,
      },
      category: "rent",
    },
    {
      id: "exp_pro_car",
      title: "Car Rental 🚗",
      amount: 4000,
      paidBy: uidAarav,
      splits: {
        [uidPro]: 1000,
        [uidRohan]: 1000,
        [uidAarav]: 1000,
        [uidAditi]: 1000,
      },
      category: "transport",
    },
  ];

  // Calculate net balances: paid - owed
  const net: Record<string, number> = {
    [uidPro]: 0,
    [uidRohan]: 0,
    [uidAarav]: 0,
    [uidAditi]: 0,
  };

  for (const exp of expenses) {
    net[exp.paidBy] += exp.amount;
    for (const [uid, share] of Object.entries(exp.splits)) {
      net[uid] -= share;
    }
  }

  // Simplify debts
  const simplifiedDebts = simplifyNetBalances(net, groupId);

  // Set the group details
  await groupRef.set({
    id: groupId,
    type: "group",
    name: "Pro Trip 🚀",
    createdBy: uidPro,
    members: [uidPro, uidRohan, uidAarav, uidAditi],
    memberDetails: {
      [uidPro]: { name: USERS.pro.name, phone: USERS.pro.phone, photoURL: null },
      [uidRohan]: { name: USERS.rohan.name, phone: USERS.rohan.phone, photoURL: null },
      [uidAarav]: { name: USERS.aarav.name, phone: USERS.aarav.phone, photoURL: null },
      [uidAditi]: { name: USERS.aditi.name, phone: USERS.aditi.phone, photoURL: null },
    },
    simplifiedDebts,
    baseCurrency: "INR",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Write expenses to Firestore subcollection
  for (const exp of expenses) {
    await groupRef.collection("expenses").doc(exp.id).set({
      groupId,
      title: exp.title,
      amount: exp.amount,
      currency: "INR",
      paidBy: exp.paidBy,
      splits: exp.splits,
      category: exp.category,
      createdBy: exp.paidBy,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isRecurring: false,
    });
  }

  console.log("Group and expenses seeded successfully.");
  console.log("\nDone! Seeding completed successfully. Test credentials:");
  console.log(`  Pro User : ${USERS.pro.phone} (OTP: 123456) -> uid: ${uidPro}`);
  console.log(`  Rohan    : ${USERS.rohan.phone} (OTP: 123456)`);
  console.log(`  Aarav    : ${USERS.aarav.phone} (OTP: 123456)`);
  console.log(`  Aditi    : ${USERS.aditi.phone} (OTP: 123456)`);
}

seed().catch((e) => {
  console.error("Seeding error:", e);
  process.exit(1);
});
