import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { mapExpense } from "@/lib/firebase/mapping";
import type { Expense } from "@/types";

export async function fetchExpense(
  groupId: string,
  expenseId: string,
): Promise<Expense | null> {
  const snap = await getAdminDb().doc(paths.expense(groupId, expenseId)).get();
  return snap.exists ? mapExpense(snap.id, snap.data()!) : null;
}

export async function fetchExpenses(groupId: string): Promise<Expense[]> {
  const snap = await getAdminDb()
    .collection(paths.expenses(groupId))
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => mapExpense(doc.id, doc.data()));
}
