"use server";

/**
 * Split-template actions. Templates are owner-scoped, group-specific recipes
 * that store participants and optional basis-point weights, never money.
 * Applying a template later still goes through the normal expense action so
 * paise reconciliation remains centralized.
 */

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections, paths } from "@/lib/firebase/collections";
import { requirePaidFeature } from "@/lib/entitlements";
import { authorizeMember, authorizeUser } from "@/features/auth/session";
import { logActionError } from "@/lib/log";
import { failure, success, type ActionResult } from "@/lib/result";
import {
  CreateTemplateSchema,
  DeleteTemplateSchema,
  parseInput,
  UpdateTemplateSchema,
  type TemplateInput,
} from "@/lib/validation";
import type { Group, TemplateSplitType, Uid } from "@/types";

type NormalizedTemplate = {
  name: string;
  splitType: TemplateSplitType;
  participants: Uid[];
  weights?: Record<Uid, number>;
  category?: string;
};

function normalizeTemplate(input: TemplateInput, group: Group): ActionResult<NormalizedTemplate> {
  const participants = Array.from(new Set(input.participants));
  if (participants.some((uid) => !group.members.includes(uid))) {
    return failure("A selected person isn't in this group.", { code: "forbidden" });
  }

  if (input.splitType === "equal") {
    return success({
      name: input.name,
      splitType: "equal",
      participants,
      ...(input.category ? { category: input.category } : {}),
    });
  }

  const weights: Record<Uid, number> = {};
  let total = 0;
  for (const uid of participants) {
    const weight = input.weights?.[uid];
    if (weight === undefined) {
      return failure("Every selected person needs a percentage weight.");
    }
    weights[uid] = weight;
    total += weight;
  }
  if (total !== 10000) {
    return failure("Template percentages must add up to exactly 100%.");
  }

  return success({
    name: input.name,
    splitType: "percentage",
    participants,
    weights,
    ...(input.category ? { category: input.category } : {}),
  });
}

export async function createTemplate(
  input: unknown,
): Promise<ActionResult<{ templateId: string }>> {
  const parsed = parseInput(CreateTemplateSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;
  const paid = await requirePaidFeature(auth.data.user.uid, "templates");
  if (!paid.ok) return paid;

  const normalized = normalizeTemplate(parsed.data, auth.data.group);
  if (!normalized.ok) return normalized;

  try {
    const ref = getAdminDb().collection(Collections.templates).doc();
    await ref.set({
      ownerUid: auth.data.user.uid,
      groupId: auth.data.group.id,
      ...normalized.data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath(`/groups/${auth.data.group.id}`);
    return success({ templateId: ref.id });
  } catch (error) {
    logActionError("createTemplate", error);
    return failure("Could not save the template.");
  }
}

export async function updateTemplate(input: unknown): Promise<ActionResult<null>> {
  const parsed = parseInput(UpdateTemplateSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });
  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;
  const paid = await requirePaidFeature(auth.data.user.uid, "templates");
  if (!paid.ok) return paid;

  const normalized = normalizeTemplate(parsed.data, auth.data.group);
  if (!normalized.ok) return normalized;

  try {
    const db = getAdminDb();
    const ref = db.doc(paths.template(parsed.data.templateId));
    const snap = await ref.get();
    if (!snap.exists) return failure("That template no longer exists.", { code: "not-found" });
    if (snap.get("ownerUid") !== auth.data.user.uid) {
      return failure("Only the owner can change this template.", { code: "forbidden" });
    }
    if (snap.get("groupId") !== auth.data.group.id) {
      return failure("That template belongs to another group.", { code: "forbidden" });
    }

    await ref.update({
      ...normalized.data,
      weights: normalized.data.weights ?? FieldValue.delete(),
      category: normalized.data.category ?? FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath(`/groups/${auth.data.group.id}`);
    return success(null);
  } catch (error) {
    logActionError("updateTemplate", error);
    return failure("Could not update the template.");
  }
}

export async function deleteTemplate(input: unknown): Promise<ActionResult<null>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(DeleteTemplateSchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  try {
    const ref = getAdminDb().doc(paths.template(parsed.data.templateId));
    const snap = await ref.get();
    if (!snap.exists) return success(null);
    if (snap.get("ownerUid") !== auth.data.uid) {
      return failure("Only the owner can delete this template.", { code: "forbidden" });
    }
    const groupId = snap.get("groupId") as string | undefined;
    await ref.delete();
    if (groupId) revalidatePath(`/groups/${groupId}`);
    return success(null);
  } catch (error) {
    logActionError("deleteTemplate", error);
    return failure("Could not delete the template.");
  }
}
