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

import {
  FieldValue,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections, paths } from "@/lib/firebase/collections";
import { recomputeSimplified } from "@/lib/recompute";
import { authorizeMember, authorizeUser } from "@/features/auth/session";
import { ensureDirectGroup } from "@/features/groups/direct-groups";
import { linkOrInvite, linkOrInviteMany } from "@/features/groups/invites";
import { memberDetailFor, userByPhone } from "@/features/groups/member-profiles";
import { mergeGuestToUser } from "@/features/groups/guest-merge";
import { logActionError } from "@/lib/log";
import { failure, success, type ActionResult } from "@/lib/result";
import {
  AcceptInviteSchema,
  AddMembersSchema,
  CreateDirectRelationshipSchema,
  CreateGroupSchema,
  FindUsersSchema,
  GroupIdSchema,
  InviteByPhoneSchema,
  parseInput,
  PhoneSchema,
  RenameGroupSchema,
} from "@/lib/validation";
import type { MemberDetail } from "@/types";

async function deleteGroupTopLevelDocuments(db: Firestore, groupId: string): Promise<void> {
  const [recurringSnap, templateSnap, inviteSnap] = await Promise.all([
    db.collection(Collections.recurring).where("groupId", "==", groupId).get(),
    db.collection(Collections.templates).where("groupId", "==", groupId).get(),
    db.collection(Collections.invites).where("groupId", "==", groupId).get(),
  ]);

  const refs: DocumentReference[] = [
    ...recurringSnap.docs.map((doc) => doc.ref),
    ...templateSnap.docs.map((doc) => doc.ref),
    ...inviteSnap.docs.map((doc) => doc.ref),
  ];
  if (refs.length === 0) return;

  const writer = db.bulkWriter();
  for (const ref of refs) writer.delete(ref);
  await writer.close();
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
      type: "group",
      name: parsed.data.name,
      createdBy: auth.data.uid,
      members: [auth.data.uid],
      memberDetails: { [auth.data.uid]: detail },
      simplifiedDebts: [],
      baseCurrency: "INR",
      groupMode: parsed.data.groupMode ?? "custom",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/groups");
    return success({ groupId: ref.id });
  } catch (error) {
    logActionError("createGroup", error);
    return failure("Could not create the group. Please try again.");
  }
}

export async function createDirectRelationship(
  input: unknown,
): Promise<ActionResult<{ groupId?: string; linked: boolean; invited: boolean; existing: boolean }>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(CreateDirectRelationshipSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  if (auth.data.phone === parsed.data.phone) {
    return failure("You can't create a 1:1 relationship with yourself.");
  }

  try {
    const db = getAdminDb();
    const currentDetail = await memberDetailFor(auth.data.uid);
    const existingUser = await userByPhone(db, parsed.data.phone);

    if (existingUser) {
      if (existingUser.uid === auth.data.uid) {
        return failure("You can't create a 1:1 relationship with yourself.");
      }
      const direct = await ensureDirectGroup(
        db,
        auth.data.uid,
        currentDetail,
        existingUser.uid,
        existingUser.detail,
      );
      revalidatePath("/groups");
      return success({
        groupId: direct.groupId,
        linked: true,
        invited: false,
        existing: direct.existing,
      });
    }

    const priorInvites = await db
      .collection(Collections.invites)
      .where("phone", "==", parsed.data.phone)
      .where("status", "==", "pending")
      .get();
    const hasPending = priorInvites.docs.some(
      (doc) => doc.get("kind") === "direct" && doc.get("invitedBy") === auth.data.uid,
    );
    if (!hasPending) {
      await db.collection(Collections.invites).add({
        kind: "direct",
        phone: parsed.data.phone,
        invitedName: parsed.data.name,
        invitedBy: auth.data.uid,
        inviterName: currentDetail.name,
        inviterPhone: currentDetail.phone,
        inviterPhotoURL: currentDetail.photoURL,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    return success({ linked: false, invited: true, existing: hasPending });
  } catch (error) {
    logActionError("createDirectRelationship", error);
    return failure("Could not create the 1:1 relationship.");
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
  } catch (error) {
    logActionError("renameGroup", error);
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
    await deleteGroupTopLevelDocuments(db, parsed.data.groupId);
    await db.recursiveDelete(ref); // removes expenses + settlements subcollections too
    revalidatePath("/groups");
    return success(null);
  } catch (error) {
    logActionError("deleteGroup", error);
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
    const shouldDeleteGroup = remaining.length === 0 || (group.type === "direct" && remaining.length < 2);

    if (shouldDeleteGroup) {
      await deleteGroupTopLevelDocuments(db, parsed.data.groupId);
      await db.recursiveDelete(ref);
    } else {
      await ref.update({
        members: FieldValue.arrayRemove(user.uid),
        [`memberDetails.${user.uid}`]: FieldValue.delete(),
        ...(group.createdBy === user.uid ? { createdBy: remaining[0] } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    revalidatePath("/groups");
    return success(null);
  } catch (error) {
    logActionError("leaveGroup", error);
    return failure("Could not leave the group.");
  }
}

export async function inviteByPhone(
  input: unknown,
): Promise<ActionResult<{ linked: boolean; inviteToken?: string }>> {
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
    if (result.outcome === "already-member") return failure("That number is already in this group.");
    revalidatePath(`/groups/${parsed.data.groupId}`);
    return success({
      linked: result.outcome === "linked",
      inviteToken: result.outcome === "invited" ? result.inviteToken : undefined,
    });
  } catch (error) {
    logActionError("inviteByPhone", error);
    return failure("Could not send the invite.");
  }
}

export async function addMembersByPhone(
  input: unknown,
): Promise<ActionResult<{ added: number; invited: number; skipped: number }>> {
  const parsed = parseInput(AddMembersSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  try {
    const result = await linkOrInviteMany(
      getAdminDb(),
      auth.data.group,
      auth.data.user.uid,
      parsed.data.people,
    );
    revalidatePath(`/groups/${parsed.data.groupId}`);
    return success(result);
  } catch (error) {
    logActionError("addMembersByPhone", error);
    return failure("Couldn't add everyone — please try the rest again.");
  }
}

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
  } catch (error) {
    logActionError("findRegisteredUsers", error);
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

    if (invite.get("kind") === "direct") {
      const inviterUid = invite.get("invitedBy") as string | undefined;
      if (!inviterUid || inviterUid === auth.data.uid) {
        await inviteRef.update({ status: "accepted", acceptedBy: auth.data.uid });
        return failure("That 1:1 invite is no longer valid.", { code: "not-found" });
      }
      const currentDetail = await memberDetailFor(auth.data.uid);
      const inviterDetail: MemberDetail = {
        name: invite.get("inviterName") ?? "Owely user",
        phone: invite.get("inviterPhone") ?? null,
        photoURL: invite.get("inviterPhotoURL") ?? null,
      };
      const direct = await ensureDirectGroup(
        db,
        inviterUid,
        inviterDetail,
        auth.data.uid,
        currentDetail,
      );
      await inviteRef.update({
        status: "accepted",
        acceptedBy: auth.data.uid,
        acceptedAt: FieldValue.serverTimestamp(),
        groupId: direct.groupId,
      });
      revalidatePath("/groups");
      return success({ groupId: direct.groupId });
    }

    const groupId = invite.get("groupId") as string;
    const guestUid = invite.get("guestUid") as string | undefined;
    const detail = await memberDetailFor(auth.data.uid);

    if (guestUid) {
      await mergeGuestToUser(db, groupId, guestUid, auth.data.uid, detail);
    } else {
      await db.doc(paths.group(groupId)).update({
        members: FieldValue.arrayUnion(auth.data.uid),
        [`memberDetails.${auth.data.uid}`]: detail,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const groupSnap = await db.doc(paths.group(groupId)).get();
    const freshMembers = (groupSnap.get("members") as string[]) ?? [];
    await recomputeSimplified(groupId, freshMembers);

    await inviteRef.update({
      status: "accepted",
      acceptedBy: auth.data.uid,
      acceptedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/groups");
    return success({ groupId });
  } catch (error) {
    logActionError("acceptInvite", error);
    return failure("Could not accept the invite.");
  }
}
