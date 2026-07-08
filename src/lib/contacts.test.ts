import { describe, expect, it } from "vitest";
import {
  contactIdForPhone,
  contactQuotaKey,
  hashContactPhone,
  normalizeImportedContact,
} from "./contacts";

describe("contact helpers", () => {
  it("normalizes Indian mobile numbers and trims names", () => {
    expect(normalizeImportedContact({ name: "  Priya  ", phone: "98765 43210" })).toMatchObject({
      name: "Priya",
      phone: "+919876543210",
    });
  });

  it("rejects invalid phones and blank names", () => {
    expect(normalizeImportedContact({ name: "Priya", phone: "12345" })).toBeNull();
    expect(normalizeImportedContact({ name: "   ", phone: "9876543210" })).toBeNull();
  });

  it("uses deterministic privacy hashes and stable document IDs", () => {
    const phone = "+919876543210";
    expect(hashContactPhone(phone)).toHaveLength(64);
    expect(contactIdForPhone(phone)).toBe(hashContactPhone(phone).slice(0, 32));
    expect(contactIdForPhone(phone)).toBe(contactIdForPhone(phone));
  });

  it("builds quota keys in Asia/Kolkata", () => {
    expect(contactQuotaKey(new Date("2026-07-07T20:00:00.000Z"))).toBe("2026-07-08");
  });
});
