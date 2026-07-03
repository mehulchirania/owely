"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import {
  recomputeSimplified,
  recomputeMutations,
  type RecomputeMutation,
} from "@/lib/recompute";
import { mapExpense } from "@/lib/firebase/mapping";
import { computeSplits } from "@/lib/expense-splits";
import { logActionError } from "@/lib/log";
import { checkFreemiumLimit, incrementCounterInTx, decrementCounterInTx } from "@/lib/freemium";
import { fetchUser } from "@/features/auth/queries";
import { authorizeMember } from "@/features/auth/session";
import { failure, success, type ActionResult } from "@/lib/result";
import {
  AddExpenseSchema,
  AddBatchExpensesSchema,
  DeleteExpenseSchema,
  EditExpenseSchema,
  parseInput,
} from "@/lib/validation";
import { isMonthClosed } from "@/features/groups/closures";
import type { Expense } from "@/types";

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

  const col = db.collection(paths.expenses(groupId));
  const ref = expense.clientId ? col.doc(expense.clientId) : col.doc();

  // Run all independent pre-flight reads in parallel: closure check, idempotency
  // check, and user-tier fetch don't depend on each other.
  const [closed, existingSnap, userDoc] = await Promise.all([
    isMonthClosed(groupId, Date.now()),
    expense.clientId ? ref.get() : Promise.resolve(null),
    fetchUser(auth.data.user.uid),
  ]);

  if (closed) {
    return failure("This month is closed. You cannot add new expenses.", { code: "closed-month" });
  }
  if (existingSnap?.exists) return success({ expenseId: ref.id });

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
    }, incrementCounterInTx(groupId));

    await recomputeSimplified(groupId, auth.data.group.members, createExpense);
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
      recomputeMutations.deleteExpense(groupId, expenseId, decrementCounterInTx(groupId)),
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

  type ExpenseWrite = Omit<Expense, "id" | "createdAt" | "updatedAt"> & {
    createdAt: FieldValue;
    updatedAt: FieldValue;
  };
  const computedExpenses: Array<{ id: string; data: ExpenseWrite }> = [];
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

  let newExpenseCount = 0;
  const countedIds = new Set<string>();
  for (const comp of computedExpenses) {
    if (countedIds.has(comp.id)) continue;
    countedIds.add(comp.id);
    if (!comp.data.clientId) {
      newExpenseCount++;
      continue;
    }
    const existing = await col.doc(comp.id).get();
    if (!existing.exists) newExpenseCount++;
  }

  const userDoc = await fetchUser(auth.data.user.uid);
  const tier = userDoc?.tier ?? "free";
  const freemium = await checkFreemiumLimit(groupId, tier, newExpenseCount);
  if (!freemium.ok) {
    return failure(
      `You've reached the ${freemium.limit} expense monthly limit. Upgrade to Owely Pro for unlimited expenses.`,
      { code: "freemium-limit" },
    );
  }

  try {
    const createdIds = new Set<string>();
    const bumpCounter = incrementCounterInTx(groupId);
    const batchMutation: RecomputeMutation = {
      write: (tx, state) => {
        createdIds.clear();
        for (const comp of computedExpenses) {
          if (createdIds.has(comp.id)) continue;
          if (state.expenses.some((expense) => expense.id === comp.id)) continue;
          tx.set(col.doc(comp.id), comp.data);
          bumpCounter(tx);
          createdIds.add(comp.id);
        }
      },
      project: (state) => {
        for (const comp of computedExpenses) {
          if (!createdIds.has(comp.id)) continue;
          state.expenses.push(mapExpense(comp.id, comp.data as FirebaseFirestore.DocumentData));
        }
      },
    };

    await recomputeSimplified(groupId, auth.data.group.members, batchMutation);

    revalidatePath(`/groups/${groupId}`);
    return success({ expenseIds: computedExpenses.map((e) => e.id) });
  } catch (error) {
    logActionError("addBatchExpenses", error);
    return failure("Could not save the batch of expenses.");
  }
}
