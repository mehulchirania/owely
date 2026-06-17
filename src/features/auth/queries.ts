import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { mapUser } from "@/lib/firebase/mapping";
import type { User } from "@/types";

export async function fetchUser(uid: string): Promise<User | null> {
  const snap = await getAdminDb().doc(paths.user(uid)).get();
  return snap.exists ? mapUser(snap.id, snap.data()!) : null;
}
