"use server";

/**
 * Settlement Server Actions.
 *
 * UPI P2P gives no payment callback, so Owely can't auto-confirm. Per Decision
 * 4 the **payer** marks a payment made (`settleUp`), optionally capturing the
 * UPI reference, and the **payee** can `disputeSettlement` if it didn't arrive.
 * A completed settlement is folded into the net balances on recompute, so the
 * matching debt disappears; disputing it brings the debt back.
 */

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { fetchUser } from "@/lib/read-model";
import { recomputeSimplified } from "@/lib/recompute";
import { authorizeMember } from "@/lib/session";
import { rupeesToPaise } from "@/lib/money";
import { failure, success, type ActionResult } from "@/lib/result";
import {
  DisputeSettlementSchema,
  parseInput,
  SettleUpSchema,
} from "@/lib/validation";

export async function settleUp(
  input: unknown,
): Promise<ActionResult<{ settlementId: string }>> {
  const parsed = parseInput(SettleUpSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const { groupId, to, amountRupees, paymentRef } = parsed.data;
  const { user, group } = auth.data;

  if (to === user.uid) return failure("You can't settle up with yourself.");
  if (!group.members.includes(to)) return failure("That person isn't in this group.");

  let amount: number;
  try {
    amount = rupeesToPaise(amountRupees);
  } catch {
    return failure("Enter a valid amount.");
  }
  if (amount <= 0) return failure("Amount must be greater than zero.");

  try {
    const db = getAdminDb();
    // Capture the payee's UPI ID at settle time for the audit record.
    const payee = await fetchUser(to);
    const ref = db.collection(paths.settlements(groupId)).doc();
    await ref.set({
      groupId,
      from: user.uid,
      to,
      amount,
      ...(payee?.upiId ? { upiId: payee.upiId } : {}),
      status: "completed",
      ...(paymentRef ? { paymentRef } : {}),
      settledBy: user.uid,
      settledAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    await recomputeSimplified(groupId, group.members);
    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/settle`);
    return success({ settlementId: ref.id });
  } catch {
    return failure("Could not record the settlement.");
  }
}

export async function disputeSettlement(input: unknown): Promise<ActionResult<null>> {
  const parsed = parseInput(DisputeSettlementSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const { groupId, settlementId } = parsed.data;
  try {
    const db = getAdminDb();
    const ref = db.doc(paths.settlement(groupId, settlementId));
    const snap = await ref.get();
    if (!snap.exists) return failure("That settlement no longer exists.", { code: "not-found" });
    // Only the payee may dispute receipt.
    if (snap.get("to") !== auth.data.user.uid) {
      return failure("Only the person who was paid can dispute this.", { code: "forbidden" });
    }
    await ref.update({ status: "disputed" });
    await recomputeSimplified(groupId, auth.data.group.members);
    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/settle`);
    return success(null);
  } catch {
    return failure("Could not dispute the settlement.");
  }
}
