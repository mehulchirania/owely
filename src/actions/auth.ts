"use server";

/**
 * Auth-related Server Actions.
 *
 * `ensureUser` runs once per sign-in (after the session cookie is set): it
 * upserts `users/{uid}` from the verified session claims and links any pending
 * phone invites to this account. Phone is the primary join key (Decision 5),
 * so a person invited before they ever signed in gets pulled into their groups
 * automatically on first login.
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections, paths } from "@/lib/firebase/collections";
import { fetchUser } from "@/lib/read-model";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { authorizeUser } from "@/lib/session";
import { logActionError } from "@/lib/log";
import { failure, success, type ActionResult } from "@/lib/result";
import { parseInput, UpdateProfileSchema } from "@/lib/validation";
import { directPairKey } from "@/lib/relationship-categories";
import type { MemberDetail, User } from "@/types";

function directGroupIdForPair(pairKey: string): string {
  return `direct_${createHash("sha256").update(pairKey).digest("hex").slice(0, 32)}`;
}

function directGroupName(a: MemberDetail, b: MemberDetail): string {
  return `${a.name} + ${b.name}`;
}

/**
 * Add `uid` to every group it was invited to by phone, and mark those invites
 * accepted. Idempotent — re-running links nothing new. Returns the count linked.
 */
async function linkPendingInvites(
  uid: string,
  phone: string | null,
  detail: MemberDetail,
): Promise<number> {
  if (!phone) return 0;
  const db = getAdminDb();
  const pending = await db
    .collection(Collections.invites)
    .where("phone", "==", phone)
    .where("status", "==", "pending")
    .get();

  let linked = 0;
  for (const inviteDoc of pending.docs) {
    const kind = inviteDoc.get("kind") ?? "group";
    try {
      if (kind === "direct") {
        const inviterUid = inviteDoc.get("invitedBy") as string | undefined;
        if (!inviterUid || inviterUid === uid) {
          await inviteDoc.ref.update({ status: "accepted", acceptedBy: uid });
          continue;
        }
        const inviterDetail: MemberDetail = {
          name: inviteDoc.get("inviterName") ?? "Owely user",
          phone: inviteDoc.get("inviterPhone") ?? null,
          photoURL: inviteDoc.get("inviterPhotoURL") ?? null,
        };
        const pairKey = directPairKey(inviterUid, uid);
        const groupRef = db.doc(paths.group(directGroupIdForPair(pairKey)));
        await db.runTransaction(async (tx) => {
          const groupSnap = await tx.get(groupRef);
          if (!groupSnap.exists) {
            tx.set(groupRef, {
              type: "direct",
              name: directGroupName(inviterDetail, detail),
              createdBy: inviterUid,
              members: [inviterUid, uid],
              memberDetails: {
                [inviterUid]: inviterDetail,
                [uid]: detail,
              },
              directPairKey: pairKey,
              directPeerUids: {
                [inviterUid]: uid,
                [uid]: inviterUid,
              },
              simplifiedDebts: [],
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          tx.update(inviteDoc.ref, {
            status: "accepted",
            acceptedBy: uid,
            acceptedAt: FieldValue.serverTimestamp(),
            groupId: groupRef.id,
          });
        });
      } else {
        const groupId = inviteDoc.get("groupId") as string;
        const groupRef = db.doc(paths.group(groupId));
        await db.runTransaction(async (tx) => {
          const groupSnap = await tx.get(groupRef);
          if (!groupSnap.exists) {
            tx.update(inviteDoc.ref, { status: "accepted", acceptedBy: uid });
            return;
          }
          tx.update(groupRef, {
            members: FieldValue.arrayUnion(uid),
            [`memberDetails.${uid}`]: detail,
            updatedAt: FieldValue.serverTimestamp(),
          });
          tx.update(inviteDoc.ref, {
            status: "accepted",
            acceptedBy: uid,
            acceptedAt: FieldValue.serverTimestamp(),
          });
        });
      }
      linked++;
    } catch (error) {
      // One bad invite shouldn't block the rest of sign-in.
      logActionError(`linkInvite:${inviteDoc.id}`, error);
    }
  }
  return linked;
}

/**
 * Upsert the signed-in user's profile and link pending invites. Safe to call
 * on every sign-in; existing `upiId` and `createdAt` are preserved.
 */
export async function ensureUser(): Promise<ActionResult<User>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const session = auth.data;

  const db = getAdminDb();
  const userRef = db.doc(paths.user(session.uid));

  try {
    const existing = await fetchUser(session.uid);
    const displayName =
      session.name?.trim() || existing?.displayName || session.phone || "Owely user";

    const profile = {
      uid: session.uid,
      displayName,
      email: session.email,
      phone: session.phone,
      photoURL: session.picture,
      // Initialise tier + currency only for new users so an existing user's
      // plan/currency is never reset on a routine re-sign-in.
      ...(existing
        ? {}
        : {
            createdAt: FieldValue.serverTimestamp(),
            tier: "free" as const,
            currency: "INR" as const,
          }),
    };
    await userRef.set(profile, { merge: true });

    await linkPendingInvites(session.uid, session.phone, {
      name: displayName,
      phone: session.phone,
      photoURL: session.picture,
    });

    const saved = await fetchUser(session.uid);
    if (!saved) return failure("Could not load your profile.");
    return success(saved);
  } catch (error) {
    logActionError("ensureUser", error);
    return failure("Could not set up your account. Please try again.");
  }
}

/**
 * Update the signed-in user's display name and/or UPI ID. The UPI ID is what
 * lets others pay them via the settle-up deep link; an empty string clears it.
 */
export async function updateProfile(input: unknown): Promise<ActionResult<User>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(UpdateProfileSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  try {
    const db = getAdminDb();
    const patch: Record<string, unknown> = {};
    if (parsed.data.displayName) patch.displayName = parsed.data.displayName;
    if (parsed.data.upiId !== undefined) {
      patch.upiId = parsed.data.upiId === "" ? FieldValue.delete() : parsed.data.upiId;
    }
    if (Object.keys(patch).length > 0) {
      await db.doc(paths.user(auth.data.uid)).set(patch, { merge: true });
    }
    revalidatePath("/settings");
    const saved = await fetchUser(auth.data.uid);
    if (!saved) return failure("Could not load your profile.");
    return success(saved);
  } catch (error) {
    logActionError("updateProfile", error);
    return failure("Could not save your profile.");
  }
}
