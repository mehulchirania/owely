"use server";

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
  AddBatchExpensesSchema,
  DeleteExpenseSchema,
  EditExpenseSchema,
  parseInput,
} from "@/lib/validation";
import { isMonthClosed } from "@/actions/closures";

export async function addExpense(input: unknown): Promise<ActionResult<{ expenseId: string }>> {
  const parsed = parseInput(AddExpenseSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const closed = await isMonthClosed(parsed.data.groupId, Date.now());
  if (closed) {
    return failure("This month is closed. You cannot add new expenses.", { code: "closed-month" });
  }

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

  const closed = await isMonthClosed(groupId, existing.get("createdAt")?.toMillis() ?? Date.now());
  if (closed) {
    return failure("This expense belongs to a closed month and cannot be edited.", { code: "closed-month" });
  }

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

  const db = getAdminDb();
  const ref = db.doc(paths.expense(groupId, expenseId));
  const existing = await ref.get();
  if (!existing.exists) return failure("That expense no longer exists.", { code: "not-found" });

  const closed = await isMonthClosed(groupId, existing.get("createdAt")?.toMillis() ?? Date.now());
  if (closed) {
    return failure("This expense belongs to a closed month and cannot be deleted.", { code: "closed-month" });
  }

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

export async function addBatchExpenses(
  input: unknown,
): Promise<ActionResult<{ expenseIds: string[] }>> {
  const parsed = parseInput(AddBatchExpensesSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const groupId = auth.data.group.id;
  const closed = await isMonthClosed(groupId, Date.now());
  if (closed) {
    return failure("This month is closed. You cannot add new expenses.", { code: "closed-month" });
  }

  const { expenses } = parsed.data;
  const db = getAdminDb();

  const computedExpenses: Array<{ id: string; data: any }> = [];
  const col = db.collection(paths.expenses(groupId));

  for (const exp of expenses) {
    const split = computeSplits(exp, auth.data.group);
    if (!split.ok) {
      return failure(`Split failed for "${exp.title}": ${split.error}`, { code: "reconciliation" });
    }

    const ref = exp.clientId ? col.doc(exp.clientId) : col.doc();
    computedExpenses.push({
      id: ref.id,
      data: {
        groupId,
        title: exp.title,
        amount: split.amount,
        currency: "INR",
        paidBy: exp.paidBy,
        splits: split.splits,
        category: exp.category,
        ...(exp.clientId ? { clientId: exp.clientId } : {}),
        createdBy: auth.data.user.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isRecurring: false,
      },
    });
  }

  const userDoc = await fetchUser(auth.data.user.uid);
  const tier = userDoc?.tier ?? "free";
  const freemium = await checkFreemiumLimit(groupId, tier);
  if (!freemium.ok) {
    return failure(
      `You've reached the ${freemium.limit} expense monthly limit. Upgrade to Owely Pro for unlimited expenses.`,
      { code: "freemium-limit" },
    );
  }

  try {
    await recomputeSimplified(groupId, auth.data.group.members, async (tx) => {
      for (const comp of computedExpenses) {
        const ref = col.doc(comp.id);
        if (comp.data.clientId) {
          const snap = await tx.get(ref);
          if (snap.exists) continue;
        }
        tx.set(ref, comp.data);
        tx.update(db.doc(paths.group(groupId)), {
          expenseCount: FieldValue.increment(1),
        });
      }
    });

    revalidatePath(`/groups/${groupId}`);
    return success({ expenseIds: computedExpenses.map((e) => e.id) });
  } catch (error) {
    logActionError("addBatchExpenses", error);
    return failure("Could not save the batch of expenses.");
  }
}
