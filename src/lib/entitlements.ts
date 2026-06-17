import "server-only";

import { fetchUser } from "@/lib/read-model";
import { failure, success, type ActionResult } from "@/lib/result";

export type PaidFeature =
  | "templates"
  | "recurring"
  | "multi-currency"
  | "ocr"
  | "pdf-export";

const FEATURE_LABELS: Record<PaidFeature, string> = {
  templates: "Templates",
  recurring: "Recurring expenses",
  "multi-currency": "Multi-currency",
  ocr: "Receipt OCR",
  "pdf-export": "PDF export",
};

/**
 * Server-side entitlement check for paid-only actions. UI paywalls are helpful,
 * but every paid Server Action must call this because actions are callable
 * directly and the Admin SDK bypasses Firestore rules.
 */
export async function requirePaidFeature(
  uid: string,
  feature: PaidFeature,
): Promise<ActionResult<null>> {
  const user = await fetchUser(uid);
  if (user?.tier === "paid") return success(null);
  return failure(`${FEATURE_LABELS[feature]} is available on Owely Pro.`, {
    code: "paid-required",
  });
}
