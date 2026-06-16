import "server-only";

/**
 * Recompute and persist a group's minimal settlement set. Shared by the expense
 * and settlement actions so there is exactly one place that derives
 * `group.simplifiedDebts`. Net balances come from all expenses, adjusted for
 * completed settlements, then run through the greedy simplifier.
 */

import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { fetchExpenses, fetchSettlements } from "@/lib/read-model";
import { netWithSettlements, simplifyFromNet } from "@/lib/simplify-debts";

export async function recomputeSimplified(
  groupId: string,
  members: string[],
): Promise<void> {
  const [expenses, settlements] = await Promise.all([
    fetchExpenses(groupId),
    fetchSettlements(groupId),
  ]);
  const completed = settlements.filter((s) => s.status === "completed");
  const net = netWithSettlements(expenses, members, completed);
  const simplified = simplifyFromNet(net, groupId, () => randomUUID());
  await getAdminDb().doc(paths.group(groupId)).update({
    simplifiedDebts: simplified,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
