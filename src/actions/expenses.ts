"use server";

/**
 * Expense Server Actions — the core money loop. Pipeline for every write:
 *
 *   authorizeMember → validate → build integer-paise splits (splitEqual /
 *   splitByWeights / assertExactSplit) → Admin write → recompute simplifyDebts
 *   over the whole group → persist group.simplifiedDebts → revalidate.
 *
 * Money never touches a float past `rupeesToPaise`. A split that doesn't
 * reconcile to the exact total is rejected before any write (a partial write
 * with a reconciliation error is worse than a failed write).
 */

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { recomputeSimplified } from "@/lib/recompute";
import { computeSplits } from "@/lib/expense-splits";
import { authorizeMember } from "@/lib/session";
import { failure, success, type ActionResult } from "@/lib/result";
import {
  AddExpenseSchema,
  DeleteExpenseSchema,
  EditExpenseSchema,
  parseInput,
} from "@/lib/validation";

export async function addExpense(input: unknown): Promise<ActionResult<{ expenseId: string }>> {
  const parsed = parseInput(AddExpenseSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const split = computeSplits(parsed.data.expense, auth.data.group);
  if (!split.ok) return failure(split.error, { code: "reconciliation" });

  const { expense } = parsed.data;
  try {
    const db = getAdminDb();
    // Idempotency: when the client supplies a clientId (offline replay), use it
    // as the doc ID. A replay of an already-saved expense is a no-op success —
    // never a duplicate, never a double-count.
    const col = db.collection(paths.expenses(auth.data.group.id));
    const ref = expense.clientId ? col.doc(expense.clientId) : col.doc();
    if (expense.clientId) {
      const existing = await ref.get();
      if (existing.exists) return success({ expenseId: ref.id });
    }
    await ref.set({
      groupId: auth.data.group.id,
      title: expense.title,
      amount: split.amount,
      currency: "INR",
      paidBy: expense.paidBy,
      splits: split.splits,
      category: expense.category,
      ...(expense.clientId ? { clientId: expense.clientId } : {}),
      createdBy: auth.data.user.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isRecurring: false,
    });
    await recomputeSimplified(auth.data.group.id, auth.data.group.members);
    revalidatePath(`/groups/${auth.data.group.id}`);
    return success({ expenseId: ref.id });
  } catch {
    return failure("Could not save the expense. Please try again.");
  }
}

export async function editExpense(input: unknown): Promise<ActionResult<null>> {
  const parsed = parseInput(EditExpenseSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const split = computeSplits(parsed.data.expense, auth.data.group);
  if (!split.ok) return failure(split.error, { code: "reconciliation" });

  const { expense, expenseId } = parsed.data;
  try {
    const db = getAdminDb();
    const ref = db.doc(paths.expense(auth.data.group.id, expenseId));
    const existing = await ref.get();
    if (!existing.exists) return failure("That expense no longer exists.", { code: "not-found" });

    await ref.update({
      title: expense.title,
      amount: split.amount,
      paidBy: expense.paidBy,
      splits: split.splits,
      category: expense.category,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await recomputeSimplified(auth.data.group.id, auth.data.group.members);
    revalidatePath(`/groups/${auth.data.group.id}`);
    return success(null);
  } catch {
    return failure("Could not update the expense.");
  }
}

export async function deleteExpense(input: unknown): Promise<ActionResult<null>> {
  const parsed = parseInput(DeleteExpenseSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  try {
    const db = getAdminDb();
    await db.doc(paths.expense(auth.data.group.id, parsed.data.expenseId)).delete();
    await recomputeSimplified(auth.data.group.id, auth.data.group.members);
    revalidatePath(`/groups/${auth.data.group.id}`);
    return success(null);
  } catch {
    return failure("Could not delete the expense.");
  }
}
