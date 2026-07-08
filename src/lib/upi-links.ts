/**
 * Higher-level UPI link builder for settlement UI.
 *
 * Encapsulates the VPA-priority rule from AGENTS.md:
 *  1. If payee has a `upiId` → all app buttons (GPay, PhonePe, generic)
 *     target the actual VPA.
 *  2. Otherwise, if payee has a phone → use phone-derived handles
 *     (`phone@upi` for GPay, `phone@ybl` for PhonePe, phone for generic).
 *  3. If neither exists → no links generated.
 *
 * Both `SettlePanel` and `GuestSettlePanel` consume this so the logic
 * lives in one place. Pure function: no React, no Firebase.
 */

import type { Paise } from "@/types";
import {
  buildUpiLink,
  buildGpayLink,
  buildGpayVpaLink,
  buildPhonepeLink,
  buildPhonepeVpaLink,
  buildPhoneUpiLink,
} from "@/lib/upi";

export interface SettleLinkParams {
  /** Payee's registered UPI VPA, if any. */
  upiId?: string;
  /** Payee's phone number, if any. */
  phone?: string;
  /** Payee display name. */
  payeeName: string;
  /** Amount in integer paise. Must be positive. */
  paise: Paise;
  /** Optional transaction note. */
  note?: string;
}

export interface SettleLinks {
  gpay: string | null;
  phonepe: string | null;
  generic: string | null;
  hasAny: boolean;
}

/**
 * Build all three UPI deep-link variants (GPay, PhonePe, generic) using
 * the VPA-priority rule. Returns `null` for each link variant when no
 * suitable target (VPA or phone) exists.
 */
export function buildSettleLinks(params: SettleLinkParams): SettleLinks {
  const { upiId, phone, payeeName, paise, note } = params;

  if (upiId) {
    // VPA-priority: use the real VPA for all three links
    const vpaParams = { upiId, payeeName, paise, note };
    return {
      gpay: buildGpayVpaLink(vpaParams),
      phonepe: buildPhonepeVpaLink(vpaParams),
      generic: buildUpiLink(vpaParams),
      hasAny: true,
    };
  }

  if (phone) {
    // Phone fallback: derive app-specific handles
    const phoneParams = { phone, payeeName, paise, note };
    return {
      gpay: buildGpayLink(phoneParams),
      phonepe: buildPhonepeLink(phoneParams),
      generic: buildPhoneUpiLink(phoneParams),
      hasAny: true,
    };
  }

  return { gpay: null, phonepe: null, generic: null, hasAny: false };
}
