import { formatPaise } from "@/lib/money";

export interface ReminderMessageParams {
  payerName: string;
  payeeName: string;
  amount: number;
  groupName: string;
  settleUrl: string;
}

export function buildSettlementReminderMessage({
  payerName,
  payeeName,
  amount,
  groupName,
  settleUrl,
}: ReminderMessageParams): string {
  return [
    `Hi ${payerName}, please settle ${formatPaise(amount)} with ${payeeName} for ${groupName}.`,
    `Open Owely: ${settleUrl}`,
  ].join(" ");
}

export function buildUpiIdNudgeMessage(name: string, groupName: string): string {
  return `Hi ${name}, can you add your UPI ID in Owely for ${groupName}? It lets me settle up directly with GPay or PhonePe.`;
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildDesktopQrPayload(upiLink: string | null): string | null {
  if (!upiLink?.startsWith("upi://pay?")) return null;
  return upiLink;
}
