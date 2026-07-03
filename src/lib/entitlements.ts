import "server-only";

import { fetchUser } from "@/features/auth/queries";
import { failure, success, type ActionResult } from "@/lib/result";

export type PaidFeature =
  | "templates"
  | "recurring"
  | "ocr"
  | "pdf-export";

const FEATURE_LABELS: Record<PaidFeature, string> = {
  templates: "Templates",
  recurring: "Recurring expenses",
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
  if (user?.tier === "paid") {
    if (user.tripPassExpiresAt && user.tripPassExpiresAt <= Date.now()) {
      return failure(`Your Trip Pass has expired. ${FEATURE_LABELS[feature]} is available on Owely Pro.`, {
        code: "paid-required",
      });
    }
    return success(null);
  }
  return failure(`${FEATURE_LABELS[feature]} is available on Owely Pro.`, {
    code: "paid-required",
  });
}
