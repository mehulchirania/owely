import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { mapOwnExpense } from "@/lib/firebase/mapping";
import type { OwnExpense } from "@/types";

export async function fetchOwnExpenses(uid: string): Promise<OwnExpense[]> {
  const snap = await getAdminDb()
    .collection(paths.ownExpenses(uid))
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => mapOwnExpense(doc.id, doc.data()));
}
