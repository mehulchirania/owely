"use server";

/**
 * Recurring-expense definitions. A definition is a recipe the scheduled
 * generator (`lib/recurring.ts`, hit by `/api/cron/recurring`) clones into a
 * real expense each month on its `dayOfMonth`. Shared definitions store the
 * resolved paise split so generation always reconciles; own definitions store
 * just the amount.
 *
 * These actions only manage the definitions — generation happens server-side on
 * a schedule, never here.
 */

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections, paths } from "@/lib/firebase/collections";
import { computeSplits } from "@/lib/expense-splits";
import { authorizeMember, authorizeUser } from "@/lib/session";
import { logActionError } from "@/lib/log";
import { rupeesToPaise } from "@/lib/money";
import { failure, success, type ActionResult } from "@/lib/result";
import {
  CreateOwnRecurringSchema,
  CreateSharedRecurringSchema,
  DeleteRecurringSchema,
  parseInput,
  UpdateRecurringSchema,
} from "@/lib/validation";

export async function createSharedRecurring(
  input: unknown,
): Promise<ActionResult<{ recurringId: string }>> {
  const parsed = parseInput(CreateSharedRecurringSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const split = computeSplits(parsed.data.expense, auth.data.group);
  if (!split.ok) return failure(split.error, { code: "reconciliation" });

  try {
    const ref = getAdminDb().collection(Collections.recurring).doc();
    await ref.set({
      scope: "shared",
      ownerUid: auth.data.user.uid,
      groupId: parsed.data.groupId,
      title: parsed.data.expense.title,
      amount: split.amount,
      currency: "INR",
      category: parsed.data.expense.category,
      paidBy: parsed.data.expense.paidBy,
      splits: split.splits,
      dayOfMonth: parsed.data.dayOfMonth,
      active: true,
      createdBy: auth.data.user.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath(`/groups/${parsed.data.groupId}`);
    return success({ recurringId: ref.id });
  } catch (error) {
    logActionError("createSharedRecurring", error);
    return failure("Could not save the recurring expense.");
  }
}

export async function createOwnRecurring(
  input: unknown,
): Promise<ActionResult<{ recurringId: string }>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(CreateOwnRecurringSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  let amount: number;
  try {
    amount = rupeesToPaise(parsed.data.expense.amountRupees);
  } catch {
    return failure("Enter a valid amount.");
  }
  if (amount <= 0) return failure("Amount must be greater than zero.");

  try {
    const ref = getAdminDb().collection(Collections.recurring).doc();
    await ref.set({
      scope: "own",
      ownerUid: auth.data.uid,
      title: parsed.data.expense.title,
      amount,
      currency: "INR",
      category: parsed.data.expense.category,
      dayOfMonth: parsed.data.dayOfMonth,
      active: true,
      createdBy: auth.data.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/own");
    return success({ recurringId: ref.id });
  } catch (error) {
    logActionError("createOwnRecurring", error);
    return failure("Could not save the recurring expense.");
  }
}

/** Pause/resume or reschedule a definition. Owner only. */
export async function updateRecurring(input: unknown): Promise<ActionResult<null>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(UpdateRecurringSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  try {
    const db = getAdminDb();
    const ref = db.doc(paths.recurringDoc(parsed.data.recurringId));
    const snap = await ref.get();
    if (!snap.exists) return failure("That recurring expense no longer exists.", { code: "not-found" });
    if (snap.get("ownerUid") !== auth.data.uid) {
      return failure("Only the owner can change this.", { code: "forbidden" });
    }
    const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (parsed.data.active !== undefined) patch.active = parsed.data.active;
    if (parsed.data.dayOfMonth !== undefined) patch.dayOfMonth = parsed.data.dayOfMonth;
    await ref.update(patch);
    return success(null);
  } catch (error) {
    logActionError("updateRecurring", error);
    return failure("Could not update the recurring expense.");
  }
}

export async function deleteRecurring(input: unknown): Promise<ActionResult<null>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(DeleteRecurringSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  try {
    const db = getAdminDb();
    const ref = db.doc(paths.recurringDoc(parsed.data.recurringId));
    const snap = await ref.get();
    if (!snap.exists) return success(null);
    if (snap.get("ownerUid") !== auth.data.uid) {
      return failure("Only the owner can delete this.", { code: "forbidden" });
    }
    await ref.delete();
    return success(null);
  } catch (error) {
    logActionError("deleteRecurring", error);
    return failure("Could not delete the recurring expense.");
  }
}
