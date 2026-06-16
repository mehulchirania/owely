import "server-only";

/**
 * Recurring-expense generator. Run on a schedule (daily) via
 * `/api/cron/recurring`. For each active definition whose `dayOfMonth` has
 * arrived and that hasn't generated this month, it clones a real expense and
 * stamps `lastRunMonth`.
 *
 * Idempotent two ways: the `lastRunMonth` guard skips a definition already run
 * this month, and the generated doc uses a deterministic ID
 * (`{recurringId}_{YYYY-MM}`) so even a double-run can't create a duplicate.
 * Safe to run daily — it catches up any day on/after `dayOfMonth`.
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections, paths } from "@/lib/firebase/collections";
import { fetchGroup } from "@/lib/read-model";
import { recomputeSimplified } from "@/lib/recompute";

/** `now` is injected for testability; defaults to the current time. */
export async function generateDueRecurring(
  now: Date = new Date(),
): Promise<{ scanned: number; generated: number }> {
  const db = getAdminDb();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  // Single-equality query (auto-indexed); the day window is filtered in memory.
  const snap = await db.collection(Collections.recurring).where("active", "==", true).get();

  let scanned = 0;
  let generated = 0;
  const affectedGroups = new Set<string>();

  for (const doc of snap.docs) {
    const r = doc.data();
    if ((r.dayOfMonth ?? 1) > day) continue; // not due yet this month
    scanned++;
    if (r.lastRunMonth === monthKey) continue; // already generated this month

    const genId = `${doc.id}_${monthKey}`;
    try {
      if (r.scope === "shared" && r.groupId) {
        const ref = db.doc(paths.expense(r.groupId, genId));
        if (!(await ref.get()).exists) {
          await ref.set({
            groupId: r.groupId,
            title: r.title,
            amount: r.amount,
            currency: "INR",
            paidBy: r.paidBy,
            splits: r.splits,
            category: r.category,
            recurringId: doc.id,
            createdBy: r.ownerUid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            isRecurring: true,
            recurrenceRule: { frequency: "monthly", dayOfMonth: r.dayOfMonth },
          });
        }
        affectedGroups.add(r.groupId);
      } else if (r.scope === "own") {
        const ref = db.doc(paths.ownExpense(r.ownerUid, genId));
        if (!(await ref.get()).exists) {
          await ref.set({
            ownerUid: r.ownerUid,
            title: r.title,
            amount: r.amount,
            currency: "INR",
            category: r.category,
            recurringId: doc.id,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      } else {
        continue; // malformed definition
      }

      await doc.ref.update({ lastRunMonth: monthKey, updatedAt: FieldValue.serverTimestamp() });
      generated++;
    } catch {
      // One bad definition shouldn't stop the rest of the run.
    }
  }

  // Recompute simplified debts once per affected group.
  for (const groupId of affectedGroups) {
    const group = await fetchGroup(groupId);
    if (group) await recomputeSimplified(groupId, group.members);
  }

  return { scanned, generated };
}
