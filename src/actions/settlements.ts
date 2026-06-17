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
import { fetchUser, fetchGroup } from "@/lib/read-model";
import {
  recomputeSimplified,
  recomputeMutations,
} from "@/lib/recompute";
import { authorizeMember } from "@/lib/session";
import { logActionError } from "@/lib/log";
import { rupeesToPaise } from "@/lib/money";
import { cookies } from "next/headers";
import { failure, success, type ActionResult } from "@/lib/result";
import {
  DisputeSettlementSchema,
  parseInput,
  SettleUpSchema,
  GuestSettleUpSchema,
} from "@/lib/validation";
import type { Group } from "@/types";
import { isMonthClosed } from "@/actions/closures";

function outstandingDebtAmount(group: Group, from: string, to: string): number {
  return group.simplifiedDebts.find((debt) => debt.from === from && debt.to === to)?.amount ?? 0;
}

export async function settleUp(
  input: unknown,
): Promise<ActionResult<{ settlementId: string }>> {
  const parsed = parseInput(SettleUpSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const closed = await isMonthClosed(parsed.data.groupId, Date.now());
  if (closed) {
    return failure("This month is closed. You cannot record new settlements.", { code: "closed-month" });
  }

  const { groupId, to, amountRupees, method, paymentRef } = parsed.data;
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

  const owed = outstandingDebtAmount(group, user.uid, to);
  if (owed <= 0) {
    return failure("There is no active balance to settle with this person.", {
      code: "no-active-debt",
    });
  }
  if (amount > owed) {
    return failure(`You can record up to Rs ${(owed / 100).toFixed(2)} for this settlement.`, {
      code: "amount-exceeds-debt",
    });
  }

  try {
    // Capture the payee's UPI ID at settle time for the audit record.
    const payee = await fetchUser(to);
    const ref = getAdminDb().collection(paths.settlements(groupId)).doc();

    // Settlement write + recompute in one transaction.
    await recomputeSimplified(
      groupId,
      group.members,
      recomputeMutations.createSettlement(groupId, ref.id, {
        groupId,
        from: user.uid,
        to,
        amount,
        method,
        ...(payee?.upiId ? { upiId: payee.upiId } : {}),
        status: "completed",
        ...(paymentRef ? { paymentRef } : {}),
        settledBy: user.uid,
        settledAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      }),
    );
    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/settle`);
    return success({ settlementId: ref.id });
  } catch (error) {
    logActionError("settleUp", error);
    return failure("Could not record the settlement.");
  }
}

export async function disputeSettlement(input: unknown): Promise<ActionResult<null>> {
  const parsed = parseInput(DisputeSettlementSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const { groupId, settlementId } = parsed.data;

  // Verify existence and ownership before entering the transaction.
  const ref = getAdminDb().doc(paths.settlement(groupId, settlementId));
  const snap = await ref.get();
  if (!snap.exists) return failure("That settlement no longer exists.", { code: "not-found" });
  if (snap.get("to") !== auth.data.user.uid) {
    return failure("Only the person who was paid can dispute this.", { code: "forbidden" });
  }

  const closed = await isMonthClosed(groupId, snap.get("createdAt")?.toMillis() ?? Date.now());
  if (closed) {
    return failure("This settlement belongs to a closed month and cannot be disputed.", { code: "closed-month" });
  }

  try {
    await recomputeSimplified(
      groupId,
      auth.data.group.members,
      recomputeMutations.updateSettlement(groupId, settlementId, {
        status: "disputed",
      }),
    );
    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/settle`);
    return success(null);
  } catch (error) {
    logActionError("disputeSettlement", error);
    return failure("Could not dispute the settlement.");
  }
}

export async function guestSettleUp(
  input: unknown,
): Promise<ActionResult<{ settlementId: string }>> {
  const parsed = parseInput(GuestSettleUpSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  const { groupId, to, amountRupees, method, paymentRef } = parsed.data;

  // Retrieve guest session cookie
  const cookieStore = await cookies();
  const guestUid = cookieStore.get(`guest_session_${groupId}`)?.value;

  if (!guestUid) {
    return failure("Access Denied: Invalid guest session.", { code: "forbidden" });
  }

  // Fetch the group and check if guestUid is a member
  const group = await fetchGroup(groupId);
  if (!group || !group.members.includes(guestUid)) {
    return failure("That group doesn't exist or you are not a member.", { code: "not-found" });
  }

  const closed = await isMonthClosed(groupId, Date.now());
  if (closed) {
    return failure("This month is closed. You cannot record settlements.", { code: "closed-month" });
  }

  if (to === guestUid) return failure("You can't settle up with yourself.");
  if (!group.members.includes(to)) return failure("That person isn't in this group.");

  let amount: number;
  try {
    amount = rupeesToPaise(amountRupees);
  } catch {
    return failure("Enter a valid amount.");
  }
  if (amount <= 0) return failure("Amount must be greater than zero.");

  const owed = outstandingDebtAmount(group, guestUid, to);
  if (owed <= 0) {
    return failure("There is no active balance to settle with this person.", {
      code: "no-active-debt",
    });
  }
  if (amount > owed) {
    return failure(`You can record up to Rs ${(owed / 100).toFixed(2)} for this settlement.`, {
      code: "amount-exceeds-debt",
    });
  }

  try {
    const payee = await fetchUser(to);
    const ref = getAdminDb().collection(paths.settlements(groupId)).doc();

    await recomputeSimplified(
      groupId,
      group.members,
      recomputeMutations.createSettlement(groupId, ref.id, {
        groupId,
        from: guestUid,
        to,
        amount,
        method,
        ...(payee?.upiId ? { upiId: payee.upiId } : {}),
        status: "completed",
        ...(paymentRef ? { paymentRef } : {}),
        settledBy: guestUid,
        settledAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      }),
    );
    revalidatePath(`/groups/${groupId}`);
    return success({ settlementId: ref.id });
  } catch (error) {
    logActionError("guestSettleUp", error);
    return failure("Could not record the settlement.");
  }
}
