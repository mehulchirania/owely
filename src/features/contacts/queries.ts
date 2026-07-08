import "server-only";

import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { mapImportedContact } from "@/lib/firebase/mapping";
import type { ImportedContact } from "@/types";

export async function fetchImportedContacts(uid: string): Promise<ImportedContact[]> {
  const snap = await getAdminDb()
    .collection(paths.contacts(uid))
    .orderBy("lastSyncedAt", "desc")
    .get();
  return snap.docs.map((doc) => mapImportedContact(doc.id, doc.data()));
}

export async function countImportedContacts(uid: string): Promise<number> {
  const snap = await getAdminDb().collection(paths.contacts(uid)).count().get();
  return snap.data().count;
}
