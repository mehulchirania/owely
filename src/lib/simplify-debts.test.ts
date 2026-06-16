import { describe, expect, it } from "vitest";
import { computeNetBalances, simplifyDebts } from "./simplify-debts";
import type { Expense, Uid } from "@/types";

let seq = 0;
const id = () => `s${seq++}`;

function expense(paidBy: Uid, splits: Record<Uid, number>): Expense {
  const amount = Object.values(splits).reduce((s, v) => s + v, 0);
  return {
    id: `e${seq++}`,
    groupId: "g1",
    title: "t",
    amount,
    currency: "INR",
    paidBy,
    splits,
    category: "general",
    createdBy: paidBy,
    createdAt: 0,
    updatedAt: 0,
    isRecurring: false,
  };
}

describe("computeNetBalances", () => {
  it("nets paid against owed and sums to zero", () => {
    const expenses = [expense("a", { a: 5000, b: 5000 })]; // a paid ₹100
    const net = computeNetBalances(expenses, ["a", "b"]);
    expect(net).toEqual({ a: 5000, b: -5000 });
    expect(net.a + net.b).toBe(0);
  });
});

describe("simplifyDebts", () => {
  it("returns no settlements when everyone is square", () => {
    const expenses = [
      expense("a", { a: 5000, b: 5000 }),
      expense("b", { a: 5000, b: 5000 }),
    ];
    expect(simplifyDebts(expenses, ["a", "b"], "g1", id)).toEqual([]);
  });

  it("collapses a chain a->b->c into a single transfer", () => {
    // a owes b 100, b owes c 100  =>  a pays c 100 directly.
    const expenses = [
      expense("b", { a: 10000 }),
      expense("c", { b: 10000 }),
    ];
    const s = simplifyDebts(expenses, ["a", "b", "c"], "g1", id);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ from: "a", to: "c", amount: 10000 });
  });

  it("conserves money and emits at most n-1 transfers", () => {
    const members = ["a", "b", "c", "d"];
    const expenses = [
      expense("a", { a: 2500, b: 2500, c: 2500, d: 2500 }),
      expense("b", { a: 3333, b: 3333, c: 3334 }),
      expense("c", { c: 9999, d: 1 }),
    ];
    const net = computeNetBalances(expenses, members);
    const s = simplifyDebts(expenses, members, "g1", id);
    expect(s.length).toBeLessThanOrEqual(members.length - 1);
    // Total paid in == total received per member reproduces net balances.
    const reconstructed: Record<string, number> = {};
    for (const m of members) reconstructed[m] = 0;
    for (const t of s) {
      reconstructed[t.from] -= t.amount;
      reconstructed[t.to] += t.amount;
    }
    expect(reconstructed).toEqual(net);
  });

  it("handles a single-member group with no transfers", () => {
    const expenses = [expense("a", { a: 5000 })];
    expect(simplifyDebts(expenses, ["a"], "g1", id)).toEqual([]);
  });
});
