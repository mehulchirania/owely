import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { Collections, paths } from "@/lib/firebase/collections";
import { sendSms } from "@/lib/sms";
import type { Group, MemberDetail } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://owely.app";

export type LinkResult =
  | { outcome: "linked" | "already-member" }
  | { outcome: "invited"; inviteToken: string };

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
    return { outcome: "already-member" };
  }

  if (existingUser) {
    if (group.members.includes(existingUser.uid)) return { outcome: "already-member" };
    await db.doc(paths.group(group.id)).update({
      members: FieldValue.arrayUnion(existingUser.uid),
      [`memberDetails.${existingUser.uid}`]: existingUser.detail,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { outcome: "linked" };
  }

  if (!pendingPhones.has(phone)) {
    const guestUid = `guest_${randomUUID()}`;
    await db.doc(paths.group(group.id)).update({
      members: FieldValue.arrayUnion(guestUid),
      [`memberDetails.${guestUid}`]: { name, phone, photoURL: null },
      updatedAt: FieldValue.serverTimestamp(),
    });
    const ref = await db.collection(Collections.invites).add({
      groupId: group.id,
      groupName: group.name,
      phone,
      invitedName: name,
      invitedBy,
      status: "pending",
      guestUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    const guestLink = `${APP_URL}/api/groups/${group.id}/guest-login?token=${ref.id}`;
    const smsBody =
      `Hi ${name}, you've been added to "${group.name}" on Owely.\n` +
      `View your share and confirm payments here: ${guestLink}`;
    sendSms(phone, smsBody).catch((e) =>
      console.error("[sms] invite delivery failed", e),
    );
    return { outcome: "invited", inviteToken: ref.id };
  }

  // Already has a pending invite — look it up to return its token
  const existingSnap = await db
    .collection(Collections.invites)
    .where("groupId", "==", group.id)
    .where("phone", "==", phone)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  const token = existingSnap.docs[0]?.id ?? "";
  return { outcome: "invited", inviteToken: token };
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
    if (result.outcome === "linked") added++;
    else if (result.outcome === "invited") invited++;
    else skipped++;
  }

  return { added, invited, skipped };
}
