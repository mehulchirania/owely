import "server-only";

/**
 * Recompute and persist a group's minimal settlement set. Shared by the expense
 * and settlement actions so there is exactly one place that derives
 * `group.simplifiedDebts`. Net balances come from all expenses, adjusted for
 * completed settlements, then run through the greedy simplifier.
 *
 * Concurrency: the whole read-modify-write runs inside a Firestore transaction
 * keyed on the group document. The group doc is the contention point — if two
 * members add an expense at the same time, Firestore retries the later
 * transaction so it recomputes from a fresh snapshot instead of clobbering the
 * winner's balances with a stale result. No ledger money can be lost (both
 * expense docs commit independently); the transaction only guarantees the
 * cached `simplifiedDebts` reflects every committed expense.
 *
 * Optional `mutate` runs inside the same transaction, after the group read and
 * before the recompute write, so the triggering write (expense add/edit/delete,
 * settlement record) participates in the atomic update and the recomputed
 * balances always match it.
 */

import { randomUUID } from "node:crypto";
import {
  FieldValue,
  type Transaction,
  type DocumentReference,
} from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { mapExpense, mapSettlement } from "@/lib/read-model";
import { netWithSettlements, simplifyFromNet } from "@/lib/simplify-debts";
import type { Settlement } from "@/types";

/** A write to perform inside the recompute transaction. */
export type RecomputeMutation = (tx: Transaction) => Promise<void> | void;

/**
 * Atomically run `mutate` (if given) and recompute `group.simplifiedDebts`.
 * The group doc is read and written within one transaction; the expense and
 * settlement reads happen against a consistent snapshot. `members` is taken
 * from the fresh group doc, not the caller's (possibly stale) copy.
 */
export async function recomputeSimplified(
  groupId: string,
  members: string[],
  mutate?: RecomputeMutation,
): Promise<void> {
  const db = getAdminDb();
  const groupRef = db.doc(paths.group(groupId));
  const expensesRef = db.collection(paths.expenses(groupId));
  const settlementsRef = db.collection(paths.settlements(groupId));

  await db.runTransaction(async (tx) => {
    // Read the group first — it pins the transaction. A concurrent write to the
    // group doc causes this transaction to retry with a fresh snapshot.
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) return;

    // Caller's members may be stale; prefer the fresh doc's member list.
    const freshMembers = (groupSnap.get("members") as string[] | undefined) ?? members;

    // Apply the triggering write (expense add/edit/delete, settlement record)
    // before reading the subcollections so the snapshot includes it.
    if (mutate) await mutate(tx);

    const [expenseSnap, settlementSnap] = await Promise.all([
      tx.get(expensesRef),
      tx.get(settlementsRef),
    ]);

    const expenses = expenseSnap.docs.map((d) => mapExpense(d.id, d.data()));
    const settlements = settlementSnap.docs.map((d) => mapSettlement(d.id, d.data()));
    const completed = settlements.filter((s) => s.status === "completed");

    const threshold = (groupSnap.get("debtThreshold") as number | undefined) ?? 0;
    const roundTo = (groupSnap.get("debtRoundTo") as number | undefined) ?? 0;

    const net = netWithSettlements(expenses, freshMembers, completed);
    const simplified: Settlement[] = simplifyFromNet(net, groupId, () => randomUUID(), Date.now(), {
      threshold,
      roundTo,
    });

    tx.update(groupRef, {
      simplifiedDebts: simplified,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

/** Pre-built mutation helpers so actions don't hand-roll transaction writes. */
export const recomputeMutations = {
  /** Create a new expense doc (idempotent if `docId` already exists). */
  createExpense: (
    groupId: string,
    docId: string,
    data: Record<string, unknown>,
  ): RecomputeMutation => async (tx) => {
    const ref: DocumentReference = getAdminDb().doc(paths.expense(groupId, docId));
    if ((await tx.get(ref)).exists) return;
    tx.set(ref, data);
  },

  /** Update an existing expense doc. */
  updateExpense: (
    groupId: string,
    expenseId: string,
    data: Record<string, unknown>,
  ): RecomputeMutation => (tx) => {
    tx.update(getAdminDb().doc(paths.expense(groupId, expenseId)), data);
  },

  /** Delete an expense doc. */
  deleteExpense: (groupId: string, expenseId: string): RecomputeMutation => (tx) => {
    tx.delete(getAdminDb().doc(paths.expense(groupId, expenseId)));
  },

  /** Create a settlement doc. */
  createSettlement: (
    groupId: string,
    docId: string,
    data: Record<string, unknown>,
  ): RecomputeMutation => (tx) => {
    tx.set(getAdminDb().doc(paths.settlement(groupId, docId)), data);
  },

  /** Update a settlement doc (e.g. mark disputed). */
  updateSettlement: (
    groupId: string,
    settlementId: string,
    data: Record<string, unknown>,
  ): RecomputeMutation => (tx) => {
    tx.update(getAdminDb().doc(paths.settlement(groupId, settlementId)), data);
  },
};
