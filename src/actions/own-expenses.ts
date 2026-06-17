"use server";

/**
 * Own (personal, un-split) expense actions. These never touch a group, have no
 * splits, and don't run the debt simplifier — they're a personal-tracking
 * ledger for bills the user pays alone (insurance, a solo utility). Stored under
 * `users/{uid}/ownExpenses`. Like shared expenses, creation is idempotent via an
 * optional client-supplied `clientId` so an offline replay can't double-count.
 */

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { authorizeUser } from "@/lib/session";
import { logActionError } from "@/lib/log";
import { rupeesToPaise } from "@/lib/money";
import { failure, success, type ActionResult } from "@/lib/result";
import {
  AddOwnExpenseSchema,
  DeleteOwnExpenseSchema,
  EditOwnExpenseSchema,
  parseInput,
} from "@/lib/validation";

export async function addOwnExpense(
  input: unknown,
): Promise<ActionResult<{ expenseId: string }>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(AddOwnExpenseSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  const { expense } = parsed.data;
  let amount: number;
  try {
    amount = rupeesToPaise(expense.amountRupees);
  } catch {
    return failure("Enter a valid amount.");
  }
  if (amount <= 0) return failure("Amount must be greater than zero.");

  try {
    const db = getAdminDb();
    const col = db.collection(paths.ownExpenses(auth.data.uid));
    const ref = expense.clientId ? col.doc(expense.clientId) : col.doc();
    if (expense.clientId) {
      const existing = await ref.get();
      if (existing.exists) return success({ expenseId: ref.id });
    }
    await ref.set({
      ownerUid: auth.data.uid,
      title: expense.title,
      amount,
      currency: "INR",
      category: expense.category,
      ...(expense.clientId ? { clientId: expense.clientId } : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/own");
    return success({ expenseId: ref.id });
  } catch (error) {
    logActionError("addOwnExpense", error);
    return failure("Could not save the expense. Please try again.");
  }
}

export async function editOwnExpense(input: unknown): Promise<ActionResult<null>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(EditOwnExpenseSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  const { expense, expenseId } = parsed.data;
  let amount: number;
  try {
    amount = rupeesToPaise(expense.amountRupees);
  } catch {
    return failure("Enter a valid amount.");
  }
  if (amount <= 0) return failure("Amount must be greater than zero.");

  try {
    const db = getAdminDb();
    const ref = db.doc(paths.ownExpense(auth.data.uid, expenseId));
    const existing = await ref.get();
    if (!existing.exists) return failure("That expense no longer exists.", { code: "not-found" });
    await ref.update({
      title: expense.title,
      amount,
      category: expense.category,
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/own");
    return success(null);
  } catch (error) {
    logActionError("editOwnExpense", error);
    return failure("Could not update the expense.");
  }
}

export async function deleteOwnExpense(input: unknown): Promise<ActionResult<null>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(DeleteOwnExpenseSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  try {
    await getAdminDb().doc(paths.ownExpense(auth.data.uid, parsed.data.expenseId)).delete();
    revalidatePath("/own");
    return success(null);
  } catch (error) {
    logActionError("deleteOwnExpense", error);
    return failure("Could not delete the expense.");
  }
}
