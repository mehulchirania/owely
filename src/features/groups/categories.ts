"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections, paths } from "@/lib/firebase/collections";
import { authorizeMember, authorizeUser } from "@/features/auth/session";
import { logActionError } from "@/lib/log";
import { predefinedRelationshipCategory } from "@/lib/relationship-categories";
import { failure, success, type ActionResult } from "@/lib/result";
import {
  CreateCategorySchema,
  DeleteCategorySchema,
  parseInput,
  SetGroupCategorySchema,
  UpdateCategorySchema,
} from "@/lib/validation";

async function updateGroupsWithCategory(
  categoryId: string,
  patch: Record<string, unknown>,
): Promise<string[]> {
  const db = getAdminDb();
  const snap = await db
    .collection(Collections.groups)
    .where("categoryId", "==", categoryId)
    .get();
  if (snap.empty) return [];

  const writer = db.bulkWriter();
  for (const doc of snap.docs) writer.update(doc.ref, patch);
  await writer.close();
  return snap.docs.map((doc) => doc.id);
}

export async function createCategory(
  input: unknown,
): Promise<ActionResult<{ categoryId: string }>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(CreateCategorySchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  try {
    const ref = getAdminDb().collection(Collections.categories).doc();
    await ref.set({
      ownerUid: auth.data.uid,
      name: parsed.data.name,
      color: parsed.data.color,
      icon: parsed.data.icon,
      appliesTo: parsed.data.appliesTo,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/people");
    revalidatePath("/groups");
    return success({ categoryId: ref.id });
  } catch (error) {
    logActionError("createCategory", error);
    return failure("Could not create the category.");
  }
}

export async function updateCategory(input: unknown): Promise<ActionResult<null>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(UpdateCategorySchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  try {
    const db = getAdminDb();
    const ref = db.doc(paths.category(parsed.data.categoryId));
    const snap = await ref.get();
    if (!snap.exists) return failure("That category no longer exists.", { code: "not-found" });
    if (snap.get("ownerUid") !== auth.data.uid) {
      return failure("Only the owner can change this category.", { code: "forbidden" });
    }
    const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.color !== undefined) patch.color = parsed.data.color;
    if (parsed.data.icon !== undefined) patch.icon = parsed.data.icon;
    if (parsed.data.appliesTo !== undefined) patch.appliesTo = parsed.data.appliesTo;
    await ref.update(patch);
    const affectedGroupIds = parsed.data.name
      ? await updateGroupsWithCategory(parsed.data.categoryId, {
          categoryName: parsed.data.name,
          updatedAt: FieldValue.serverTimestamp(),
        })
      : [];
    for (const groupId of affectedGroupIds) revalidatePath(`/groups/${groupId}`);
    revalidatePath("/people");
    revalidatePath("/groups");
    return success(null);
  } catch (error) {
    logActionError("updateCategory", error);
    return failure("Could not update the category.");
  }
}

export async function deleteCategory(input: unknown): Promise<ActionResult<null>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(DeleteCategorySchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  try {
    const db = getAdminDb();
    const ref = db.doc(paths.category(parsed.data.categoryId));
    const snap = await ref.get();
    if (!snap.exists) return success(null);
    if (snap.get("ownerUid") !== auth.data.uid) {
      return failure("Only the owner can delete this category.", { code: "forbidden" });
    }
    const affectedGroupIds = await updateGroupsWithCategory(parsed.data.categoryId, {
      categoryId: FieldValue.delete(),
      categoryName: FieldValue.delete(),
      categoryKind: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await ref.delete();
    for (const groupId of affectedGroupIds) revalidatePath(`/groups/${groupId}`);
    revalidatePath("/people");
    revalidatePath("/groups");
    return success(null);
  } catch (error) {
    logActionError("deleteCategory", error);
    return failure("Could not delete the category.");
  }
}

export async function setGroupCategory(input: unknown): Promise<ActionResult<null>> {
  const parsed = parseInput(SetGroupCategorySchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const { groupId, categoryId } = parsed.data;
  try {
    const db = getAdminDb();
    const groupRef = db.doc(paths.group(groupId));

    if (categoryId === null) {
      await groupRef.update({
        categoryId: FieldValue.delete(),
        categoryName: FieldValue.delete(),
        categoryKind: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      revalidatePath(`/groups/${groupId}`);
      revalidatePath("/groups");
      revalidatePath("/people");
      return success(null);
    }

    const predefined = predefinedRelationshipCategory(categoryId);
    let name: string;
    let kind: "predefined" | "custom";
    if (predefined) {
      name = predefined.name;
      kind = "predefined";
    } else {
      const catSnap = await db.doc(paths.category(categoryId)).get();
      if (!catSnap.exists) return failure("That category no longer exists.", { code: "not-found" });
      if (catSnap.get("ownerUid") !== auth.data.user.uid) {
        return failure("You can only use your own categories.", { code: "forbidden" });
      }
      name = catSnap.get("name") ?? "";
      kind = "custom";
    }

    await groupRef.update({
      categoryId,
      categoryName: name,
      categoryKind: kind,
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/groups");
    revalidatePath("/people");
    return success(null);
  } catch (error) {
    logActionError("setGroupCategory", error);
    return failure("Could not set the category.");
  }
}
