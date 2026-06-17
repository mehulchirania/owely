import "server-only";

/**
 * Freemium limit enforcement.
 *
 * Free-tier users are capped at 100 expenses per group per calendar month. Paid
 * users have no limit. The counter lives in `groups/{groupId}/counters/{YYYY-MM}`
 * so each month is a fresh document — no cron-driven resets, no stale counters.
 *
 * Usage: call `checkFreemiumLimit(groupId, userTier)` before writing an expense.
 * On the free tier, it reads the current month's counter and rejects at 100.
 * The counter itself is incremented inside the same recompute transaction so
 * concurrent adds cannot bypass the limit.
 */

import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";

/** Max expenses per group per month on the free tier. */
const FREE_MONTHLY_LIMIT = 100;

/** Return the YYYY-MM key for the current month in India timezone (IST, UTC+5:30). */
export function currentMonthKey(now: Date = new Date()): string {
  // Firestore doesn't have a timezone-aware now(), so we derive the month
  // from the server's Date. App Hosting runs in a single region, so this
  // is consistent across invocations. If we later deploy multi-region,
  // this should use Asia/Kolkata explicitly.
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export type FreemiumResult =
  | { ok: true }
  | { ok: false; reason: "limit-reached"; limit: number };

/**
 * Check whether a new expense can be added to the group this month.
 * Returns `{ ok: false, reason: "limit-reached" }` when the free-tier cap is
 * hit; the caller should surface an upgrade prompt.
 *
 * Call this before entering the recompute transaction. The counter increment
 * happens inside the transaction (see `incrementCounterInTx`).
 */
export async function checkFreemiumLimit(
  groupId: string,
  userTier: "free" | "paid",
): Promise<FreemiumResult> {
  if (userTier === "paid") return { ok: true };

  const db = getAdminDb();
  const counterRef = db.doc(paths.groupCounter(groupId, currentMonthKey()));
  const snap = await counterRef.get();

  if (!snap.exists) return { ok: true }; // First expense this month.

  const count: number = snap.get("count") ?? 0;
  if (count >= FREE_MONTHLY_LIMIT) {
    return { ok: false, reason: "limit-reached", limit: FREE_MONTHLY_LIMIT };
  }
  return { ok: true };
}

/**
 * Increment the monthly counter inside a recompute transaction. Call this from
 * the `mutate` callback so the counter increment is atomic with the expense
 * write and the simplified-debts recompute.
 */
export function incrementCounterInTx(
  groupId: string,
): (tx: Transaction) => void {
  const monthKey = currentMonthKey();
  return (tx: Transaction) => {
    const ref = getAdminDb().doc(paths.groupCounter(groupId, monthKey));
    // mergeFields: true means we create the doc if missing and increment `count`
    // without overwriting any other fields.
    tx.set(
      ref,
      { count: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  };
}
