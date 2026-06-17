import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { Collections } from "@/lib/firebase/collections";
import { mapSplitTemplate } from "@/lib/firebase/mapping";
import type { SplitTemplate } from "@/types";

export async function fetchGroupTemplates(
  uid: string,
  groupId: string,
): Promise<SplitTemplate[]> {
  const snap = await getAdminDb()
    .collection(Collections.templates)
    .where("ownerUid", "==", uid)
    .where("groupId", "==", groupId)
    .get();
  return snap.docs
    .map((doc) => mapSplitTemplate(doc.id, doc.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}
