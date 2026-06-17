"use server";

/**
 * Relationship-category actions — the write path the rest of the category
 * feature was missing (the read side, rule, predefined constants, and
 * `Group.category*` fields already existed). Custom categories are owner-scoped
 * docs in `categories/{id}`; predefined ones live in code. `setGroupCategory`
 * tags a group or 1:1 relationship with either kind (or clears it).
 */

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections, paths } from "@/lib/firebase/collections";
import { authorizeMember, authorizeUser } from "@/lib/session";
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
    await ref.delete();
    revalidatePath("/people");
    revalidatePath("/groups");
    return success(null);
  } catch (error) {
    logActionError("deleteCategory", error);
    return failure("Could not delete the category.");
  }
}

/**
 * Tag a group / 1:1 relationship with a category, or clear it (`categoryId:
 * null`). Accepts a predefined id (resolved from code) or a custom category the
 * caller owns. The category name + kind are denormalised onto the group for
 * list rendering without a secondary read.
 */
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

    // Predefined (in code) takes precedence; otherwise a custom doc the user owns.
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
