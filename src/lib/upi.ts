/**
 * UPI deep-link builder. Owely never holds funds — it only opens the user's
 * UPI app pre-filled, deliberately staying outside payment-aggregator
 * regulation.
 *
 *   upi://pay?pa={vpa}&pn={payeeName}&am={amount}&cu=INR
 *
 * `am` is in **rupees** with exactly two decimals (UPI expects rupees, not
 * paise) — the paise→rupees conversion happens here, at the link boundary, and
 * nowhere else. Pure function: no React, no Firebase.
 */

import type { Paise } from "@/types";

export interface UpiLinkParams {
  /** Payee VPA, e.g. "name@okaxis". */
  upiId: string;
  /** Payee display name shown in the UPI app. */
  payeeName: string;
  /** Amount in integer paise. Must be a positive integer. */
  paise: Paise;
  /** Optional transaction note (`tn`). */
  note?: string;
}

export interface PhoneUpiParams {
  /** Payee registered phone number, e.g. "+919876543210" or "9876543210". */
  phone: string;
  /** Payee display name shown in the UPI app. */
  payeeName: string;
  /** Amount in integer paise. Must be a positive integer. */
  paise: Paise;
  /** Optional transaction note (`tn`). */
  note?: string;
}

export function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function buildUpiLink({ upiId, payeeName, paise, note }: UpiLinkParams): string {
  if (!upiId) throw new Error("buildUpiLink: missing payee UPI ID");
  if (!Number.isInteger(paise) || paise <= 0) {
    throw new Error(`buildUpiLink: amount must be positive integer paise, got ${paise}`);
  }
  const amount = (paise / 100).toFixed(2);
  const parts = [
    `pa=${encodeURIComponent(upiId)}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${amount}`,
    "cu=INR",
  ];
  if (note) parts.push(`tn=${encodeURIComponent(note)}`);
  return `upi://pay?${parts.join("&")}`;
}

export function buildGpayLink({ phone, payeeName, paise, note }: PhoneUpiParams): string {
  if (!phone) throw new Error("buildGpayLink: missing payee phone number");
  if (!Number.isInteger(paise) || paise <= 0) {
    throw new Error(`buildGpayLink: amount must be positive integer paise, got ${paise}`);
  }
  const clean = cleanPhone(phone);
  const amount = (paise / 100).toFixed(2);
  const parts = [
    `pa=${encodeURIComponent(clean + "@upi")}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${amount}`,
    "cu=INR",
  ];
  if (note) parts.push(`tn=${encodeURIComponent(note)}`);
  return `intent://upi/pay?${parts.join("&")}#Intent;scheme=tez;package=com.google.android.apps.nbu.paisa.user;end`;
}

export function buildPhonepeLink({ phone, payeeName, paise, note }: PhoneUpiParams): string {
  if (!phone) throw new Error("buildPhonepeLink: missing payee phone number");
  if (!Number.isInteger(paise) || paise <= 0) {
    throw new Error(`buildPhonepeLink: amount must be positive integer paise, got ${paise}`);
  }
  const clean = cleanPhone(phone);
  const amount = (paise / 100).toFixed(2);
  const parts = [
    `pa=${encodeURIComponent(clean + "@ybl")}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${amount}`,
    "cu=INR",
  ];
  if (note) parts.push(`tn=${encodeURIComponent(note)}`);
  return `intent://pay?${parts.join("&")}#Intent;scheme=phonepe;package=com.phonepe.app;end`;
}

export function buildPhoneUpiLink({ phone, payeeName, paise, note }: PhoneUpiParams): string {
  if (!phone) throw new Error("buildPhoneUpiLink: missing payee phone number");
  if (!Number.isInteger(paise) || paise <= 0) {
    throw new Error(`buildPhoneUpiLink: amount must be positive integer paise, got ${paise}`);
  }
  const clean = cleanPhone(phone);
  const amount = (paise / 100).toFixed(2);
  const parts = [
    `pa=${encodeURIComponent(clean)}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${amount}`,
    "cu=INR",
  ];
  if (note) parts.push(`tn=${encodeURIComponent(note)}`);
  return `upi://pay?${parts.join("&")}`;
}

