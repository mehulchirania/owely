"use server";

import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { fetchExpenses } from "@/features/expenses/queries";
import { fetchSettlements } from "@/features/settlements/queries";
import { authorizeMember } from "@/features/auth/session";
import { netWithSettlements } from "@/lib/simplify-debts";
import { logActionError } from "@/lib/log";
import { failure, success, type ActionResult } from "@/lib/result";
import { CloseMonthSchema, parseInput } from "@/lib/validation";
import type { MonthlyClosure } from "@/types";

function monthEndCutoffInIndia(year: number, month: number): number {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  return Date.UTC(year, month, 1) - istOffsetMs;
}

/**
 * Check if the given date falls in a closed month/year for a group.
 * A month is closed if there is a closure record for that month or any subsequent month.
 */
export async function isMonthClosed(
  groupId: string,
  dateOrEpoch: Date | number,
): Promise<boolean> {
  const d = typeof dateOrEpoch === "number" ? new Date(dateOrEpoch) : dateOrEpoch;
  // Consistent with currentMonthKey() in freemium.ts — derive month in IST.
  const ist = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const year = ist.getFullYear();
  const month = ist.getMonth() + 1;
  const targetId = `${year}-${String(month).padStart(2, "0")}`;

  const db = getAdminDb();
  const closuresSnap = await db
    .collection(paths.closures(groupId))
    .where(FieldPath.documentId(), ">=", targetId)
    .limit(1)
    .get();

  return !closuresSnap.empty;
}

export async function closeMonth(input: unknown): Promise<ActionResult<{ closureId: string }>> {
  const parsed = parseInput(CloseMonthSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  const { groupId, month, year } = parsed.data;
  const auth = await authorizeMember(groupId);
  if (!auth.ok) return auth;

  // The next month starts at 00:00 IST after the closed month.
  const cutoffTime = monthEndCutoffInIndia(year, month);

  try {
    const db = getAdminDb();
    const closureId = `${year}-${String(month).padStart(2, "0")}`;
    const closureRef = db.doc(paths.closure(groupId, closureId));

    const existing = await closureRef.get();
    if (existing.exists) {
      return failure(`Month ${year}-${month} is already closed.`);
    }

    // Fetch all historical expenses and settlements up to the cutoff date.
    const [expenses, settlements] = await Promise.all([
      fetchExpenses(groupId),
      fetchSettlements(groupId),
    ]);

    const filteredExpenses = expenses.filter((e) => e.createdAt < cutoffTime);
    const filteredSettlements = settlements.filter(
      (s) => s.createdAt < cutoffTime && s.status === "completed",
    );

    // Calculate carry forward balances at the end of the closed month
    const carryForward = netWithSettlements(filteredExpenses, auth.data.group.members, filteredSettlements);

    // Save the closure record and update group.monthlyCloseEnabled
    await db.runTransaction(async (tx) => {
      tx.create(closureRef, {
        id: closureId,
        groupId,
        month,
        year,
        status: "closed",
        carryForward,
        closedBy: auth.data.user.uid,
        closedAt: FieldValue.serverTimestamp(),
      });

      tx.update(db.doc(paths.group(groupId)), {
        monthlyCloseEnabled: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    revalidatePath(`/groups/${groupId}`);
    return success({ closureId });
  } catch (error) {
    logActionError("closeMonth", error);
    return failure("Failed to close month.");
  }
}

import { mapClosure } from "@/lib/firebase/mapping";

export async function fetchClosures(groupId: string): Promise<MonthlyClosure[]> {
  try {
    const db = getAdminDb();
    const snap = await db.collection(paths.closures(groupId)).get();
    return snap.docs.map((doc) => mapClosure(doc.id, doc.data()));
  } catch (error) {
    console.error("fetchClosures failed:", error);
    return [];
  }
}
