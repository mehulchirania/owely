import "server-only";

import { type Firestore } from "firebase-admin/firestore";
import { Collections } from "@/lib/firebase/collections";
import { fetchUser } from "@/features/auth/queries";
import type { MemberDetail } from "@/types";

export async function memberDetailFor(uid: string): Promise<MemberDetail> {
  const user = await fetchUser(uid);
  return {
    name: user?.displayName ?? "Owely user",
    phone: user?.phone ?? null,
    photoURL: user?.photoURL ?? null,
  };
}

export async function userByPhone(
  db: Firestore,
  phone: string,
): Promise<{ uid: string; detail: MemberDetail } | null> {
  const snap = await db
    .collection(Collections.users)
    .where("phone", "==", phone)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return {
    uid: doc.id,
    detail: {
      name: doc.get("displayName") ?? "Owely user",
      phone: doc.get("phone") ?? phone,
      photoURL: doc.get("photoURL") ?? null,
    },
  };
}
