import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Mock auth before importing actions
vi.mock("@/features/auth/session", () => ({
  authorizeUser: vi.fn().mockResolvedValue({ ok: true, data: { uid: "test-uid", phone: "+919876543210" } }),
}));

// Mock admin DB
vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: vi.fn(),
}));

import { getAdminDb } from "@/lib/firebase/admin";
import { syncContacts } from "./actions";

function fakeDbWithQuota(count: number, txThrows = false) {
  return {
    doc: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ exists: false }),
    }),
    bulkWriter: vi.fn().mockReturnValue({
      set: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    }),
    batch: vi.fn().mockReturnValue({
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
    collection: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: [] }),
    }),
    runTransaction: vi.fn().mockImplementation(async (cb: Parameters<FirebaseFirestore.Firestore["runTransaction"]>[0]) => {
      if (txThrows) throw new Error("quota-exceeded");
      const tx = {
        get: vi.fn().mockResolvedValue({ exists: true, get: (field: string) => (field === "count" ? count : null) }),
        set: vi.fn(),
      };
      await cb(tx);
    }),
  };
}

describe("syncContacts", () => {
  it("enforces daily quota of 500 contacts", async () => {
    vi.mocked(getAdminDb).mockReturnValue(fakeDbWithQuota(0, true) as never);
    
    const input = {
      contacts: Array.from({ length: 20 }).map((_, i) => ({
        name: `User ${i}`,
        phone: `98765432${i.toString().padStart(2, "0")}`,
      }))
    };
    
    const res = await syncContacts(input);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/limit reached/i);
    }
  });

  it("allows sync if within quota", async () => {
    vi.mocked(getAdminDb).mockReturnValue(fakeDbWithQuota(490, false) as never);
    
    const input = {
      contacts: Array.from({ length: 10 }).map((_, i) => ({
        name: `User ${i}`,
        phone: `98765432${i.toString().padStart(2, "0")}`,
      }))
    };
    
    const res = await syncContacts(input);
    expect(res.ok).toBe(true);
  });
});
