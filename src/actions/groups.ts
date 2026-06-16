"use server";

/**
 * Group Server Actions — the only write path for groups and invites. Every
 * action verifies the session and (where relevant) group membership itself,
 * because the Admin SDK bypasses Firestore rules.
 *
 * Invites: phone is the primary join key (Decision 5). `inviteByPhone` links an
 * already-registered user immediately; otherwise it leaves a pending invite
 * that `ensureUser` claims on that person's first sign-in.
 */

import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections, paths } from "@/lib/firebase/collections";
import { fetchUser } from "@/lib/read-model";
import { authorizeMember, authorizeUser } from "@/lib/session";
import { failure, success, type ActionResult } from "@/lib/result";
import {
  AcceptInviteSchema,
  AddMembersSchema,
  CreateGroupSchema,
  FindUsersSchema,
  GroupIdSchema,
  InviteByPhoneSchema,
  parseInput,
  PhoneSchema,
  RenameGroupSchema,
} from "@/lib/validation";
import type { Group, MemberDetail } from "@/types";

async function memberDetailFor(uid: string): Promise<MemberDetail> {
  const user = await fetchUser(uid);
  return {
    name: user?.displayName ?? "Owely user",
    phone: user?.phone ?? null,
    photoURL: user?.photoURL ?? null,
  };
}

export async function createGroup(input: unknown): Promise<ActionResult<{ groupId: string }>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(CreateGroupSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  try {
    const db = getAdminDb();
    const ref = db.collection(Collections.groups).doc();
    const detail = await memberDetailFor(auth.data.uid);
    await ref.set({
      name: parsed.data.name,
      createdBy: auth.data.uid,
      members: [auth.data.uid],
      memberDetails: { [auth.data.uid]: detail },
      simplifiedDebts: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/groups");
    return success({ groupId: ref.id });
  } catch {
    return failure("Could not create the group. Please try again.");
  }
}

export async function renameGroup(input: unknown): Promise<ActionResult<null>> {
  const parsed = parseInput(RenameGroupSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  try {
    await getAdminDb().doc(paths.group(parsed.data.groupId)).update({
      name: parsed.data.name,
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath("/groups");
    return success(null);
  } catch {
    return failure("Could not rename the group.");
  }
}

export async function deleteGroup(input: unknown): Promise<ActionResult<null>> {
  const parsed = parseInput(GroupIdSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;
  if (auth.data.group.createdBy !== auth.data.user.uid) {
    return failure("Only the group creator can delete it.", { code: "forbidden" });
  }

  try {
    const db = getAdminDb();
    const ref = db.doc(paths.group(parsed.data.groupId));
    await db.recursiveDelete(ref); // removes expenses + settlements subcollections too
    revalidatePath("/groups");
    return success(null);
  } catch {
    return failure("Could not delete the group.");
  }
}

export async function leaveGroup(input: unknown): Promise<ActionResult<null>> {
  const parsed = parseInput(GroupIdSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const { user, group } = auth.data;
  try {
    const db = getAdminDb();
    const ref = db.doc(paths.group(parsed.data.groupId));
    const remaining = group.members.filter((m) => m !== user.uid);

    if (remaining.length === 0) {
      await db.recursiveDelete(ref);
    } else {
      await ref.update({
        members: FieldValue.arrayRemove(user.uid),
        [`memberDetails.${user.uid}`]: FieldValue.delete(),
        // Hand the group to another member if the creator leaves.
        ...(group.createdBy === user.uid ? { createdBy: remaining[0] } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    revalidatePath("/groups");
    return success(null);
  } catch {
    return failure("Could not leave the group.");
  }
}

type LinkResult = "linked" | "invited" | "already-member";

/**
 * Add one person to a group by name + phone. If a user with that phone already
 * exists they're added immediately (`linked`); otherwise a pending
 * `invites/{id}` is left for them to claim on first sign-in (`invited`). Shared
 * by `inviteByPhone` (one) and `addMembersByPhone` (batch). No revalidate /
 * try-catch here — the caller owns those.
 */
async function linkOrInvite(
  db: Firestore,
  group: Group,
  invitedBy: string,
  name: string,
  phone: string,
): Promise<LinkResult> {
  if (Object.values(group.memberDetails).some((d) => d.phone === phone)) {
    return "already-member";
  }

  const existing = await db
    .collection(Collections.users)
    .where("phone", "==", phone)
    .limit(1)
    .get();

  if (!existing.empty) {
    const userDoc = existing.docs[0];
    if (group.members.includes(userDoc.id)) return "already-member";
    const detail: MemberDetail = {
      name: userDoc.get("displayName") ?? name,
      phone,
      photoURL: userDoc.get("photoURL") ?? null,
    };
    await db.doc(paths.group(group.id)).update({
      members: FieldValue.arrayUnion(userDoc.id),
      [`memberDetails.${userDoc.id}`]: detail,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return "linked";
  }

  // Skip if a pending invite for this phone+group already exists (no spam).
  const priorInvites = await db
    .collection(Collections.invites)
    .where("phone", "==", phone)
    .get();
  const hasPending = priorInvites.docs.some(
    (d) => d.get("groupId") === group.id && d.get("status") === "pending",
  );
  if (!hasPending) {
    await db.collection(Collections.invites).add({
      groupId: group.id,
      groupName: group.name,
      phone,
      invitedName: name,
      invitedBy,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  return "invited";
}

export async function inviteByPhone(
  input: unknown,
): Promise<ActionResult<{ linked: boolean }>> {
  const parsed = parseInput(InviteByPhoneSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  try {
    const result = await linkOrInvite(
      getAdminDb(),
      auth.data.group,
      auth.data.user.uid,
      parsed.data.name,
      parsed.data.phone,
    );
    if (result === "already-member") return failure("That number is already in this group.");
    revalidatePath(`/groups/${parsed.data.groupId}`);
    return success({ linked: result === "linked" });
  } catch {
    return failure("Could not send the invite.");
  }
}

/**
 * Batch-add people (e.g. picked from the device contacts) by name + phone.
 * Registered users join immediately; everyone else gets a pending invite.
 * Returns how many were added vs invited vs already present.
 */
export async function addMembersByPhone(
  input: unknown,
): Promise<ActionResult<{ added: number; invited: number; skipped: number }>> {
  const parsed = parseInput(AddMembersSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const db = getAdminDb();
  const seen = new Set<string>();
  let added = 0;
  let invited = 0;
  let skipped = 0;
  try {
    for (const person of parsed.data.people) {
      if (seen.has(person.phone)) continue; // dedup within the batch
      seen.add(person.phone);
      const r = await linkOrInvite(db, auth.data.group, auth.data.user.uid, person.name, person.phone);
      if (r === "linked") added++;
      else if (r === "invited") invited++;
      else skipped++;
    }
    revalidatePath(`/groups/${parsed.data.groupId}`);
    return success({ added, invited, skipped });
  } catch {
    return failure("Couldn't add everyone — please try the rest again.");
  }
}

/**
 * Given raw phone numbers (e.g. from the contact picker), return which already
 * have an Owely account — so the client can show "already on Owely" and add
 * them seamlessly. Phones are normalised to E.164; invalid ones are ignored.
 */
export async function findRegisteredUsers(
  input: unknown,
): Promise<ActionResult<Array<{ phone: string; uid: string; name: string; photoURL: string | null }>>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(FindUsersSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  const normalized = new Set<string>();
  for (const raw of parsed.data.phones) {
    const r = PhoneSchema.safeParse(raw);
    if (r.success) normalized.add(r.data);
  }
  if (normalized.size === 0) return success([]);

  const phones = [...normalized];
  try {
    const db = getAdminDb();
    const out: Array<{ phone: string; uid: string; name: string; photoURL: string | null }> = [];
    // Firestore `in` allows up to 30 values per query.
    for (let i = 0; i < phones.length; i += 30) {
      const chunk = phones.slice(i, i + 30);
      const snap = await db.collection(Collections.users).where("phone", "in", chunk).get();
      for (const doc of snap.docs) {
        out.push({
          phone: doc.get("phone"),
          uid: doc.id,
          name: doc.get("displayName") ?? "",
          photoURL: doc.get("photoURL") ?? null,
        });
      }
    }
    return success(out);
  } catch {
    return failure("Could not check your contacts right now.");
  }
}

export async function acceptInvite(input: unknown): Promise<ActionResult<{ groupId: string }>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(AcceptInviteSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  try {
    const db = getAdminDb();
    const inviteRef = db.doc(`${Collections.invites}/${parsed.data.inviteId}`);
    const invite = await inviteRef.get();
    if (!invite.exists) return failure("That invite no longer exists.", { code: "not-found" });
    if (invite.get("phone") !== auth.data.phone) {
      return failure("This invite was sent to a different number.", { code: "forbidden" });
    }

    const groupId = invite.get("groupId") as string;
    const detail = await memberDetailFor(auth.data.uid);
    await db.doc(paths.group(groupId)).update({
      members: FieldValue.arrayUnion(auth.data.uid),
      [`memberDetails.${auth.data.uid}`]: detail,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await inviteRef.update({
      status: "accepted",
      acceptedBy: auth.data.uid,
      acceptedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/groups");
    return success({ groupId });
  } catch {
    return failure("Could not accept the invite.");
  }
}
