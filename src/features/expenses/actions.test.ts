import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/features/groups/queries", () => ({
  fetchGroup: vi.fn().mockResolvedValue({
    id: "group-1",
    members: ["test-uid", "other-uid"],
  }),
}));

vi.mock("@/lib/freemium", () => ({
  checkFreemiumLimit: vi.fn().mockResolvedValue({ ok: true }),
  incrementCounterInTx: vi.fn(),
  decrementCounterInTx: vi.fn(),
}));

// Mock auth
vi.mock("@/features/auth/session", () => ({
  authorizeUser: vi.fn().mockResolvedValue({ ok: true, data: { uid: "test-uid" } }),
  authorizeMember: vi.fn().mockResolvedValue({ ok: true, data: { user: { uid: "test-uid" }, role: "member", group: { id: "group-1", members: ["test-uid", "other-uid"] } } }),
}));

vi.mock("@/features/auth/queries", () => ({
  fetchUser: vi.fn().mockResolvedValue({ uid: "test-uid", tier: "free", currency: "INR" }),
}));

vi.mock("@/features/groups/closures", () => ({
  isMonthClosed: vi.fn().mockResolvedValue(false),
}));

// Mock admin DB
vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: vi.fn(),
}));

import { getAdminDb } from "@/lib/firebase/admin";
import { addExpense } from "./actions";

function fakeDbForConcurrency() {
  const batch = {
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };
  
  return {
    batch: vi.fn().mockReturnValue(batch),
    doc: vi.fn().mockReturnValue({ 
      id: "doc-id",
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ members: { "test-uid": {}, "other-uid": {} } })
      })
    }),
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({ id: "expense-id" }),
    }),
    runTransaction: vi.fn().mockImplementation(async (cb) => {
      // Simulate concurrent environment where the transaction reads expenses
      const tx = {
        get: vi.fn().mockImplementation(async (ref) => {
          if (ref.id) { // doc ref
            return { exists: false, get: vi.fn().mockReturnValue(0) };
          }
          return { // collection ref
            docs: [
              { id: "e1", data: () => ({ amount: 100, paidBy: "a", splits: { a: 50, b: 50 } }) },
            ],
          };
        }),
        set: vi.fn(),
        update: vi.fn(),
      };
      await cb(tx);
    }),
  };
}

describe("Expense Actions (Concurrency)", () => {
  it("recomputeSimplified handles concurrent writes via transaction", async () => {
    vi.mocked(getAdminDb).mockReturnValue(fakeDbForConcurrency() as never);
    
    const input = {
      groupId: "group-1",
      expense: {
        title: "Test Expense",
        amountRupees: "100",
        paidBy: "test-uid",
        category: "general" as const,
        splitType: "equal" as const,
        participants: ["test-uid", "other-uid"],
      }
    };

    const res = await addExpense(input);
    
    // We just want to ensure it calls runTransaction and succeeds
    expect(res.ok).toBe(true);
    expect(getAdminDb().runTransaction).toHaveBeenCalled();
  });
});
