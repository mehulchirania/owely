import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { mapSettlement } from "@/lib/firebase/mapping";
import type { Settlement } from "@/types";

export async function fetchSettlements(groupId: string): Promise<Settlement[]> {
  const snap = await getAdminDb()
    .collection(paths.settlements(groupId))
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => mapSettlement(doc.id, doc.data()));
}
