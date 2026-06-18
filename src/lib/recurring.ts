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
import { fetchGroup } from "@/features/groups/queries";
import { recomputeSimplified } from "@/lib/recompute";
import { logActionError } from "@/lib/log";

function indiaDateParts(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const partValue = (type: "year" | "month" | "day") => {
    const part = parts.find((item) => item.type === type)?.value;
    return part ? Number(part) : 0;
  };
  return {
    year: partValue("year"),
    month: partValue("month"),
    day: partValue("day"),
  };
}

type GenerationOutcome =
  | { status: "generated"; groupId?: string }
  | { status: "already-generated" }
  | { status: "not-due" }
  | { status: "malformed" };

/** `now` is injected for testability; defaults to the current time. */
export async function generateDueRecurring(
  now: Date = new Date(),
): Promise<{ scanned: number; generated: number }> {
  const db = getAdminDb();
  const { year, month, day } = indiaDateParts(now);
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
      const outcome = await db.runTransaction<GenerationOutcome>(async (tx) => {
        const recurringSnap = await tx.get(doc.ref);
        if (!recurringSnap.exists || recurringSnap.get("active") !== true) {
          return { status: "not-due" };
        }
        if ((recurringSnap.get("dayOfMonth") ?? 1) > day) return { status: "not-due" };
        if (recurringSnap.get("lastRunMonth") === monthKey) {
          return { status: "already-generated" };
        }

        const ownerUid = recurringSnap.get("ownerUid") as string | undefined;
        const scope = recurringSnap.get("scope") as string | undefined;
        if (!ownerUid) return { status: "malformed" };

        if (scope === "shared") {
          const groupId = recurringSnap.get("groupId") as string | undefined;
          if (!groupId) return { status: "malformed" };
          const ref = db.doc(paths.expense(groupId, genId));
          const targetSnap = await tx.get(ref);
          if (!targetSnap.exists) {
            tx.set(ref, {
              groupId,
              title: recurringSnap.get("title"),
              amount: recurringSnap.get("amount"),
              currency: "INR",
              paidBy: recurringSnap.get("paidBy"),
              splits: recurringSnap.get("splits"),
              category: recurringSnap.get("category"),
              recurringId: doc.id,
              createdBy: ownerUid,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
              isRecurring: true,
              recurrenceRule: {
                frequency: "monthly",
                dayOfMonth: recurringSnap.get("dayOfMonth") ?? 1,
              },
            });
          }
          tx.update(doc.ref, {
            lastRunMonth: monthKey,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return targetSnap.exists ? { status: "already-generated" } : { status: "generated", groupId };
        }

        if (scope === "own") {
          const ref = db.doc(paths.ownExpense(ownerUid, genId));
          const targetSnap = await tx.get(ref);
          if (!targetSnap.exists) {
            tx.set(ref, {
              ownerUid,
              title: recurringSnap.get("title"),
              amount: recurringSnap.get("amount"),
              currency: "INR",
              category: recurringSnap.get("category"),
              recurringId: doc.id,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          tx.update(doc.ref, {
            lastRunMonth: monthKey,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return targetSnap.exists ? { status: "already-generated" } : { status: "generated" };
        }

        return { status: "malformed" };
      });

      if (outcome.status === "generated") {
        generated++;
        if (outcome.groupId) affectedGroups.add(outcome.groupId);
      }
    } catch (error) {
      // One bad definition shouldn't stop the rest of the run — but log it so
      // a silently broken recurring rule is discoverable, not invisible.
      logActionError(`generateRecurring:${doc.id}`, error);
    }
  }

  // Recompute simplified debts once per affected group.
  for (const groupId of affectedGroups) {
    const group = await fetchGroup(groupId);
    if (group) await recomputeSimplified(groupId, group.members);
  }

  return { scanned, generated };
}
