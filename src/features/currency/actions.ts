"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { requirePaidFeature } from "@/lib/entitlements";
import { getAdminDb } from "@/lib/firebase/admin";
import { paths } from "@/lib/firebase/collections";
import { logActionError } from "@/lib/log";
import { failure, success, type ActionResult } from "@/lib/result";
import { authorizeMember, authorizeUser } from "@/features/auth/session";
import {
  parseInput,
  SetGroupBaseCurrencySchema,
  UpdateDisplayCurrencySchema,
} from "@/lib/validation";
import type { CurrencyCode } from "@/types";

export async function updateDisplayCurrency(
  input: unknown,
): Promise<ActionResult<{ currency: CurrencyCode }>> {
  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  const parsed = parseInput(UpdateDisplayCurrencySchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  const entitlement = await requirePaidFeature(auth.data.uid, "multi-currency");
  if (!entitlement.ok) return entitlement;

  try {
    await getAdminDb().doc(paths.user(auth.data.uid)).set(
      {
        currency: parsed.data.currency,
      },
      { merge: true },
    );
    revalidatePath("/settings");
    revalidatePath("/groups");
    return success({ currency: parsed.data.currency });
  } catch (error) {
    logActionError("updateDisplayCurrency", error);
    return failure("Could not update your display currency.");
  }
}

export async function setGroupBaseCurrency(
  input: unknown,
): Promise<ActionResult<{ currency: CurrencyCode }>> {
  const parsed = parseInput(SetGroupBaseCurrencySchema, input);
  if (!parsed.success) return failure(parsed.message, { fieldErrors: parsed.fieldErrors });

  const auth = await authorizeMember(parsed.data.groupId);
  if (!auth.ok) return auth;

  const entitlement = await requirePaidFeature(auth.data.user.uid, "multi-currency");
  if (!entitlement.ok) return entitlement;

  if (auth.data.group.createdBy !== auth.data.user.uid) {
    return failure("Only the group creator can change the base currency.", {
      code: "forbidden",
    });
  }

  try {
    await getAdminDb().doc(paths.group(parsed.data.groupId)).update({
      baseCurrency: parsed.data.currency,
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath("/groups");
    return success({ currency: parsed.data.currency });
  } catch (error) {
    logActionError("setGroupBaseCurrency", error);
    return failure("Could not update the group currency.");
  }
}
