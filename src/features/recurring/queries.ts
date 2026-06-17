import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { Collections } from "@/lib/firebase/collections";
import { mapRecurring } from "@/lib/firebase/mapping";
import type { RecurringExpense } from "@/types";

export async function fetchOwnedRecurring(uid: string): Promise<RecurringExpense[]> {
  const snap = await getAdminDb()
    .collection(Collections.recurring)
    .where("ownerUid", "==", uid)
    .get();
  return snap.docs
    .map((doc) => mapRecurring(doc.id, doc.data()))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function fetchGroupRecurring(groupId: string): Promise<RecurringExpense[]> {
  const snap = await getAdminDb()
    .collection(Collections.recurring)
    .where("groupId", "==", groupId)
    .get();
  return snap.docs
    .map((doc) => mapRecurring(doc.id, doc.data()))
    .sort((a, b) => b.createdAt - a.createdAt);
}
