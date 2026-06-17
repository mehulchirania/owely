/**
 * Server-side read model (Admin SDK).
 *
 * Server Components read through here for initial render. Two jobs:
 *  1. Centralise the Firestore `Timestamp → epoch millis` conversion so the
 *     `number` timestamp fields in `src/types` hold everywhere (writes use
 *     `serverTimestamp()`, which reads back as a `Timestamp`).
 *  2. Shape raw documents into the domain types, never leaking Firestore types
 *     past this boundary.
 *
 * Reads here bypass security rules (Admin SDK), so every caller must already
 * have authorised the user — see `src/lib/session.ts`.
 */

import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections, paths } from "@/lib/firebase/collections";
import type {
  Expense,
  Group,
  OwnExpense,
  RecurringExpense,
  RelationshipCategory,
  Settlement,
  User,
} from "@/types";

/** Coerce a Firestore timestamp-ish value into epoch millis. */
function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return 0;
}

type DocData = FirebaseFirestore.DocumentData;

function mapUser(uid: string, d: DocData): User {
  return {
    uid,
    displayName: d.displayName ?? "",
    email: d.email ?? null,
    phone: d.phone ?? null,
    photoURL: d.photoURL ?? null,
    upiId: d.upiId,
    tier: d.tier ?? "free",
    currency: d.currency ?? "INR",
    createdAt: toMillis(d.createdAt),
  };
}

function mapGroup(id: string, d: DocData): Group {
  return {
    id,
    type: d.type ?? "group",
    name: d.name ?? "",
    createdBy: d.createdBy,
    members: d.members ?? [],
    memberDetails: d.memberDetails ?? {},
    categoryId: d.categoryId,
    categoryName: d.categoryName,
    categoryKind: d.categoryKind,
    directPairKey: d.directPairKey,
    directPeerUids: d.directPeerUids,
    // simplifiedDebts are stored as plain objects (numbers already), pass through.
    simplifiedDebts: (d.simplifiedDebts ?? []) as Settlement[],
    baseCurrency: d.baseCurrency,
    expenseCount: d.expenseCount,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
}

function mapRelationshipCategory(id: string, d: DocData): RelationshipCategory {
  return {
    id,
    ownerUid: d.ownerUid,
    name: d.name ?? "",
    color: d.color ?? "accent",
    icon: d.icon ?? "tag",
    appliesTo: d.appliesTo ?? "both",
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
}

export function mapExpense(id: string, d: DocData): Expense {
  return {
    id,
    groupId: d.groupId,
    title: d.title ?? "",
    amount: d.amount ?? 0,
    currency: d.currency ?? "INR",
    paidBy: d.paidBy,
    splits: d.splits ?? {},
    category: d.category ?? "general",
    receiptURL: d.receiptURL,
    clientId: d.clientId,
    recurringId: d.recurringId,
    createdBy: d.createdBy,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
    isRecurring: d.isRecurring ?? false,
    recurrenceRule: d.recurrenceRule,
  };
}

function mapOwnExpense(id: string, d: DocData): OwnExpense {
  return {
    id,
    ownerUid: d.ownerUid,
    title: d.title ?? "",
    amount: d.amount ?? 0,
    currency: d.currency ?? "INR",
    category: d.category ?? "general",
    clientId: d.clientId,
    recurringId: d.recurringId,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
}

function mapRecurring(id: string, d: DocData): RecurringExpense {
  return {
    id,
    scope: d.scope,
    ownerUid: d.ownerUid,
    groupId: d.groupId,
    title: d.title ?? "",
    amount: d.amount ?? 0,
    currency: d.currency ?? "INR",
    category: d.category ?? "general",
    paidBy: d.paidBy,
    splits: d.splits,
    dayOfMonth: d.dayOfMonth ?? 1,
    active: d.active ?? true,
    lastRunMonth: d.lastRunMonth,
    createdBy: d.createdBy,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
}

export function mapSettlement(id: string, d: DocData): Settlement {
  return {
    id,
    groupId: d.groupId,
    from: d.from,
    to: d.to,
    amount: d.amount ?? 0,
    upiId: d.upiId,
    status: d.status ?? "pending",
    paymentRef: d.paymentRef,
    settledBy: d.settledBy,
    settledAt: d.settledAt != null ? toMillis(d.settledAt) : undefined,
    createdAt: toMillis(d.createdAt),
  };
}

export async function fetchUser(uid: string): Promise<User | null> {
  const snap = await getAdminDb().doc(paths.user(uid)).get();
  return snap.exists ? mapUser(snap.id, snap.data()!) : null;
}

export async function fetchGroup(groupId: string): Promise<Group | null> {
  const snap = await getAdminDb().doc(paths.group(groupId)).get();
  return snap.exists ? mapGroup(snap.id, snap.data()!) : null;
}

/** Every group the user belongs to, newest activity first. */
export async function fetchUserGroups(uid: string): Promise<Group[]> {
  const snap = await getAdminDb()
    .collection(Collections.groups)
    .where("members", "array-contains", uid)
    .get();
  return snap.docs
    .map((doc) => mapGroup(doc.id, doc.data()))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Non-direct groups the user belongs to, newest activity first. */
export async function fetchStandardGroups(uid: string): Promise<Group[]> {
  const groups = await fetchUserGroups(uid);
  return groups.filter((group) => group.type !== "direct");
}

/** 1:1 direct relationships the user belongs to, newest activity first. */
export async function fetchDirectGroups(uid: string): Promise<Group[]> {
  const groups = await fetchUserGroups(uid);
  return groups.filter((group) => group.type === "direct");
}

/** A single expense, or null if it doesn't exist. */
export async function fetchExpense(
  groupId: string,
  expenseId: string,
): Promise<Expense | null> {
  const snap = await getAdminDb().doc(paths.expense(groupId, expenseId)).get();
  return snap.exists ? mapExpense(snap.id, snap.data()!) : null;
}

/** All expenses in a group, newest first. */
export async function fetchExpenses(groupId: string): Promise<Expense[]> {
  const snap = await getAdminDb()
    .collection(paths.expenses(groupId))
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => mapExpense(doc.id, doc.data()));
}

/** All settlements in a group, newest first. */
export async function fetchSettlements(groupId: string): Promise<Settlement[]> {
  const snap = await getAdminDb()
    .collection(paths.settlements(groupId))
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => mapSettlement(doc.id, doc.data()));
}

/** A user's personal (un-split) expenses, newest first. */
export async function fetchOwnExpenses(uid: string): Promise<OwnExpense[]> {
  const snap = await getAdminDb()
    .collection(paths.ownExpenses(uid))
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => mapOwnExpense(doc.id, doc.data()));
}

/** Recurring definitions a user owns (both scopes), newest first. */
export async function fetchOwnedRecurring(uid: string): Promise<RecurringExpense[]> {
  const snap = await getAdminDb()
    .collection(Collections.recurring)
    .where("ownerUid", "==", uid)
    .get();
  return snap.docs
    .map((doc) => mapRecurring(doc.id, doc.data()))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Recurring definitions targeting a group (shared scope), newest first. */
export async function fetchGroupRecurring(groupId: string): Promise<RecurringExpense[]> {
  const snap = await getAdminDb()
    .collection(Collections.recurring)
    .where("groupId", "==", groupId)
    .get();
  return snap.docs
    .map((doc) => mapRecurring(doc.id, doc.data()))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Custom categories owned by a user for organizing groups/direct people. */
export async function fetchRelationshipCategories(
  uid: string,
): Promise<RelationshipCategory[]> {
  const snap = await getAdminDb()
    .collection(Collections.categories)
    .where("ownerUid", "==", uid)
    .get();
  return snap.docs
    .map((doc) => mapRelationshipCategory(doc.id, doc.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}
