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
import {
  recomputeSimplified,
  recomputeMutations,
} from "@/lib/recompute";
import { computeSplits } from "@/lib/expense-splits";
import { logActionError } from "@/lib/log";
import { checkFreemiumLimit, incrementCounterInTx } from "@/lib/freemium";
import { fetchUser } from "@/lib/read-model";
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
  const groupId = auth.data.group.id;
  const db = getAdminDb();

  // Enforce freemium: free-tier users are capped at 100 expenses/group/month.
  const userDoc = await fetchUser(auth.data.user.uid);
  const tier = userDoc?.tier ?? "free";
  const freemium = await checkFreemiumLimit(groupId, tier);
  if (!freemium.ok) {
    return failure(
      `You've reached the ${freemium.limit} expense monthly limit. Upgrade to Owely Pro for unlimited expenses.`,
      { code: "freemium-limit" },
    );
  }

  // Idempotency: when the client supplies a clientId (offline replay), use it
  // as the doc ID. A replay of an already-saved expense is a no-op success —
  // never a duplicate, never a double-count.
  const col = db.collection(paths.expenses(groupId));
  const ref = expense.clientId ? col.doc(expense.clientId) : col.doc();

  if (expense.clientId) {
    const existing = await ref.get();
    if (existing.exists) return success({ expenseId: ref.id });
  }

  try {
    // The expense write and recompute run inside one Firestore transaction.
    // The group doc is the contention point — concurrent writes cause a retry
    // with a fresh snapshot so simplifiedDebts always reflects all commits.
    const createExpense = recomputeMutations.createExpense(groupId, ref.id, {
      groupId,
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
    const bumpCounter = incrementCounterInTx(groupId);

    await recomputeSimplified(groupId, auth.data.group.members, async (tx) => {
      await createExpense(tx);
      bumpCounter(tx);
    });
    revalidatePath(`/groups/${groupId}`);
    return success({ expenseId: ref.id });
  } catch (error) {
    logActionError("addExpense", error);
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
  const groupId = auth.data.group.id;
  const db = getAdminDb();
  const ref = db.doc(paths.expense(groupId, expenseId));

  // Verify existence before entering the transaction.
  const existing = await ref.get();
  if (!existing.exists) return failure("That expense no longer exists.", { code: "not-found" });

  try {
    await recomputeSimplified(
      groupId,
      auth.data.group.members,
      recomputeMutations.updateExpense(groupId, expenseId, {
        title: expense.title,
        amount: split.amount,
        paidBy: expense.paidBy,
        splits: split.splits,
        category: expense.category,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
    revalidatePath(`/groups/${groupId}`);
    return success(null);
  } catch (error) {
    logActionError("editExpense", error);
    return failure("Could not update the expense.");
  }
}

export async function deleteExpense(input: unknown): Promise<ActionResult<null>> {
  const parsed = parseInput(DeleteExpenseSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const { expenseId } = parsed.data;
  const groupId = auth.data.group.id;

  try {
    await recomputeSimplified(
      groupId,
      auth.data.group.members,
      recomputeMutations.deleteExpense(groupId, expenseId),
    );
    revalidatePath(`/groups/${groupId}`);
    return success(null);
  } catch (error) {
    logActionError("deleteExpense", error);
    return failure("Could not delete the expense.");
  }
}
