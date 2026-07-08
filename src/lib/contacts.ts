import { createHash } from "crypto";
import { PhoneSchema } from "@/lib/validation";

export interface RawContactInput {
  name: string;
  phone: string;
}

export interface NormalizedContactInput {
  name: string;
  phone: string;
  contactId: string;
  phoneHash: string;
}

export function hashContactPhone(phone: string): string {
  return createHash("sha256").update(phone).digest("hex");
}

export function contactIdForPhone(phone: string): string {
  return hashContactPhone(phone).slice(0, 32);
}

export function normalizeImportedContact(input: RawContactInput): NormalizedContactInput | null {
  const parsedPhone = PhoneSchema.safeParse(input.phone);
  const name = input.name.trim().slice(0, 60);
  if (!parsedPhone.success || !name) return null;
  const phone = parsedPhone.data;
  return {
    name,
    phone,
    contactId: contactIdForPhone(phone),
    phoneHash: hashContactPhone(phone),
  };
}

export function contactQuotaKey(now = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}
