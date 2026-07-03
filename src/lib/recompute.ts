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
 * Optional `mutate` runs inside the same transaction after every Firestore read
 * has completed. Firestore rejects read-after-write transactions, so mutations
 * also project their effect into the in-memory expense/settlement arrays before
 * the simplified balance is derived.
 */

import { randomUUID } from "node:crypto";
import {
  FieldValue,
  type Transaction,
} from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { mapExpense, mapSettlement } from "@/lib/firebase/mapping";
import { netWithSettlements, simplifyFromNet } from "@/lib/simplify-debts";
import type { Expense, Settlement } from "@/types";

interface RecomputeState {
  expenses: Expense[];
  settlements: Settlement[];
}

/** A write plus its in-memory projection inside the recompute transaction. */
export interface RecomputeMutation {
  write: (tx: Transaction, state: RecomputeState) => Promise<void> | void;
  project?: (state: RecomputeState) => void;
}

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

    const [expenseSnap, settlementSnap] = await Promise.all([
      tx.get(expensesRef),
      tx.get(settlementsRef),
    ]);

    const state: RecomputeState = {
      expenses: expenseSnap.docs.map((d) => mapExpense(d.id, d.data())),
      settlements: settlementSnap.docs.map((d) => mapSettlement(d.id, d.data())),
    };

    if (mutate) {
      await mutate.write(tx, state);
      mutate.project?.(state);
    }

    const completed = state.settlements.filter((s) => s.status === "completed");

    const threshold = (groupSnap.get("debtThreshold") as number | undefined) ?? 0;
    const roundTo = (groupSnap.get("debtRoundTo") as number | undefined) ?? 0;

    const net = netWithSettlements(state.expenses, freshMembers, completed);
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
    onCreate?: (tx: Transaction) => void,
  ): RecomputeMutation => {
    let shouldCreate = false;
    return {
      write: (tx, state) => {
        shouldCreate = !state.expenses.some((expense) => expense.id === docId);
        if (!shouldCreate) return;
        tx.set(getAdminDb().doc(paths.expense(groupId, docId)), data);
        onCreate?.(tx);
      },
      project: (state) => {
        if (!shouldCreate) return;
        state.expenses.push(mapExpense(docId, data as FirebaseFirestore.DocumentData));
      },
    };
  },

  /** Update an existing expense doc. */
  updateExpense: (
    groupId: string,
    expenseId: string,
    data: Record<string, unknown>,
  ): RecomputeMutation => ({
    write: (tx) => {
      tx.update(getAdminDb().doc(paths.expense(groupId, expenseId)), data);
    },
    project: (state) => {
      const index = state.expenses.findIndex((expense) => expense.id === expenseId);
      if (index === -1) return;
      state.expenses[index] = mapExpense(expenseId, {
        ...state.expenses[index],
        ...data,
      } as FirebaseFirestore.DocumentData);
    },
  }),

  /** Delete an expense doc. */
  deleteExpense: (
    groupId: string,
    expenseId: string,
    onDelete?: (tx: Transaction) => void,
  ): RecomputeMutation => ({
    write: (tx) => {
      tx.delete(getAdminDb().doc(paths.expense(groupId, expenseId)));
      onDelete?.(tx);
    },
    project: (state) => {
      state.expenses = state.expenses.filter((expense) => expense.id !== expenseId);
    },
  }),

  /** Create a settlement doc. */
  createSettlement: (
    groupId: string,
    docId: string,
    data: Record<string, unknown>,
  ): RecomputeMutation => ({
    write: (tx) => {
      tx.set(getAdminDb().doc(paths.settlement(groupId, docId)), data);
    },
    project: (state) => {
      state.settlements.push(mapSettlement(docId, data as FirebaseFirestore.DocumentData));
    },
  }),

  /** Update a settlement doc (e.g. mark disputed). */
  updateSettlement: (
    groupId: string,
    settlementId: string,
    data: Record<string, unknown>,
  ): RecomputeMutation => ({
    write: (tx) => {
      tx.update(getAdminDb().doc(paths.settlement(groupId, settlementId)), data);
    },
    project: (state) => {
      const index = state.settlements.findIndex((settlement) => settlement.id === settlementId);
      if (index === -1) return;
      state.settlements[index] = mapSettlement(settlementId, {
        ...state.settlements[index],
        ...data,
      } as FirebaseFirestore.DocumentData);
    },
  }),
};
