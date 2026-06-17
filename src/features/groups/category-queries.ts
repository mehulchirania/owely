import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { Collections } from "@/lib/firebase/collections";
import { mapRelationshipCategory } from "@/lib/firebase/mapping";
import type { RelationshipCategory } from "@/types";

export async function fetchRelationshipCategories(
  uid: string,
): Promise<RelationshipCategory[]> {
  const snap = await getAdminDb()
    .collection(Collections.categories)
    .where("ownerUid", "==", uid)
    .get();
  return snap.docs
    .map((doc) => mapRelationshipCategory(doc.id, doc.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}
