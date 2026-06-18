import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { Collections, paths } from "@/lib/firebase/collections";
import type { Group, MemberDetail } from "@/types";

export type LinkResult = "linked" | "invited" | "already-member";

type UserByPhone = {
  uid: string;
  detail: MemberDetail;
};

async function usersByPhone(db: Firestore, phones: string[]): Promise<Map<string, UserByPhone>> {
  const out = new Map<string, UserByPhone>();
  for (let i = 0; i < phones.length; i += 30) {
    const chunk = phones.slice(i, i + 30);
    if (chunk.length === 0) continue;
    const snap = await db.collection(Collections.users).where("phone", "in", chunk).get();
    for (const doc of snap.docs) {
      const phone = doc.get("phone") as string | undefined;
      if (!phone) continue;
      out.set(phone, {
        uid: doc.id,
        detail: {
          name: doc.get("displayName") ?? "Owely user",
          phone,
          photoURL: doc.get("photoURL") ?? null,
        },
      });
    }
  }
  return out;
}

async function pendingInvitePhones(db: Firestore, groupId: string, phones: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < phones.length; i += 30) {
    const chunk = phones.slice(i, i + 30);
    if (chunk.length === 0) continue;
    const snap = await db
      .collection(Collections.invites)
      .where("phone", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      const phone = doc.get("phone") as string | undefined;
      if (phone && doc.get("groupId") === groupId && doc.get("status") === "pending") {
        out.add(phone);
      }
    }
  }
  return out;
}

export async function linkOrInvite(
  db: Firestore,
  group: Group,
  invitedBy: string,
  name: string,
  phone: string,
): Promise<LinkResult> {
  const [existingUsers, pendingPhones] = await Promise.all([
    usersByPhone(db, [phone]),
    pendingInvitePhones(db, group.id, [phone]),
  ]);
  return linkOrInviteKnownPhone(db, group, invitedBy, name, phone, existingUsers.get(phone), pendingPhones);
}

async function linkOrInviteKnownPhone(
  db: Firestore,
  group: Group,
  invitedBy: string,
  name: string,
  phone: string,
  existingUser: UserByPhone | undefined,
  pendingPhones: Set<string>,
): Promise<LinkResult> {
  if (Object.values(group.memberDetails).some((detail) => detail.phone === phone)) {
    return "already-member";
  }

  if (existingUser) {
    if (group.members.includes(existingUser.uid)) return "already-member";
    await db.doc(paths.group(group.id)).update({
      members: FieldValue.arrayUnion(existingUser.uid),
      [`memberDetails.${existingUser.uid}`]: existingUser.detail,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return "linked";
  }

  if (!pendingPhones.has(phone)) {
    const guestUid = `guest_${randomUUID()}`;
    await db.doc(paths.group(group.id)).update({
      members: FieldValue.arrayUnion(guestUid),
      [`memberDetails.${guestUid}`]: { name, phone, photoURL: null },
      updatedAt: FieldValue.serverTimestamp(),
    });
    await db.collection(Collections.invites).add({
      groupId: group.id,
      groupName: group.name,
      phone,
      invitedName: name,
      invitedBy,
      status: "pending",
      guestUid,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return "invited";
}

export async function linkOrInviteMany(
  db: Firestore,
  group: Group,
  invitedBy: string,
  people: Array<{ name: string; phone: string }>,
): Promise<{ added: number; invited: number; skipped: number }> {
  const deduped = Array.from(new Map(people.map((person) => [person.phone, person])).values());
  const phones = deduped.map((person) => person.phone);
  const [existingUsers, pendingPhones] = await Promise.all([
    usersByPhone(db, phones),
    pendingInvitePhones(db, group.id, phones),
  ]);

  let added = 0;
  let invited = 0;
  let skipped = 0;
  for (const person of deduped) {
    const result = await linkOrInviteKnownPhone(
      db,
      group,
      invitedBy,
      person.name,
      person.phone,
      existingUsers.get(person.phone),
      pendingPhones,
    );
    if (result === "linked") added++;
    else if (result === "invited") invited++;
    else skipped++;
  }

  return { added, invited, skipped };
}
