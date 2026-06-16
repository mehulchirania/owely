/**
 * Debt simplification engine.
 *
 * Reduces a group's expense history to the minimum set of transfers that
 * settles everyone. Pure function, integer-paise throughout — runs identically
 * on the server (inside a Server Action) and in tests.
 *
 * Algorithm: net-balance + greedy largest-debtor/largest-creditor matching.
 * This does not always produce the provably minimal number of transfers (that
 * problem is NP-hard), but it produces at most n-1 transfers and is the same
 * heuristic Splitwise uses. Correctness — conservation of money — is exact.
 */

import type { Expense, Settlement, Uid } from "@/types";

/** Compute each member's net balance in paise (paid − owed). Sums to 0. */
export function computeNetBalances(
  expenses: Expense[],
  members: Uid[],
): Record<Uid, number> {
  const net: Record<Uid, number> = {};
  for (const uid of members) net[uid] = 0;

  for (const e of expenses) {
    // Payer is credited the full amount they fronted...
    net[e.paidBy] = (net[e.paidBy] ?? 0) + e.amount;
    // ...and every participant is debited their share.
    for (const [uid, share] of Object.entries(e.splits)) {
      net[uid] = (net[uid] ?? 0) - share;
    }
  }
  return net;
}

/**
 * Greedy minimum-cashflow settlement.
 *
 * `idFactory` lets the caller supply deterministic/unique ids (e.g. a UUID
 * fn). `now` is injected for testability. Returns settlements sorted largest
 * first for stable output.
 */
export function simplifyDebts(
  expenses: Expense[],
  members: Uid[],
  groupId: string,
  idFactory: () => string,
  now: number = Date.now(),
): Settlement[] {
  return simplifyFromNet(computeNetBalances(expenses, members), groupId, idFactory, now);
}

/**
 * Same greedy settlement as `simplifyDebts`, but driven by a precomputed net
 * balance map. The action layer uses this to fold *completed settlements* into
 * the net (a payment from→to credits the debtor) before simplifying, so a debt
 * that's already been paid doesn't reappear on the next recompute.
 */
export function simplifyFromNet(
  net: Record<Uid, number>,
  groupId: string,
  idFactory: () => string,
  now: number = Date.now(),
): Settlement[] {
  // Partition into creditors (owed money) and debtors (owe money).
  const creditors: Array<{ uid: Uid; amount: number }> = [];
  const debtors: Array<{ uid: Uid; amount: number }> = [];
  for (const [uid, balance] of Object.entries(net)) {
    if (balance > 0) creditors.push({ uid, amount: balance });
    else if (balance < 0) debtors.push({ uid, amount: -balance });
  }

  // Largest first so we clear the biggest imbalances in the fewest hops.
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const transfer = Math.min(creditor.amount, debtor.amount);

    if (transfer > 0) {
      settlements.push({
        id: idFactory(),
        groupId,
        from: debtor.uid,
        to: creditor.uid,
        amount: transfer,
        status: "pending",
        createdAt: now,
      });
    }

    creditor.amount -= transfer;
    debtor.amount -= transfer;
    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }

  return settlements.sort((a, b) => b.amount - a.amount);
}

/**
 * Net balances from expenses, adjusted for already-completed settlements. A
 * completed payment `from → to` credits the debtor (`from`) and debits the
 * creditor (`to`), so paid-off debts don't reappear when the group is
 * re-simplified. Disputed/pending settlements are intentionally NOT folded in —
 * only money that actually moved.
 */
export function netWithSettlements(
  expenses: Expense[],
  members: Uid[],
  completedSettlements: Settlement[],
): Record<Uid, number> {
  const net = computeNetBalances(expenses, members);
  for (const s of completedSettlements) {
    if (s.from in net) net[s.from] += s.amount;
    if (s.to in net) net[s.to] -= s.amount;
  }
  return net;
}

/**
 * A member's net position from a set of (simplified) transfers, in paise.
 * Positive ⇒ they are owed money (net creditor); negative ⇒ they owe.
 * Used for the at-a-glance "you are owed / you owe" summary, which reads off
 * the already-stored `group.simplifiedDebts` rather than recomputing.
 */
export function netPositionFromSettlements(
  settlements: Settlement[],
  uid: Uid,
): number {
  let net = 0;
  for (const s of settlements) {
    if (s.to === uid) net += s.amount;
    if (s.from === uid) net -= s.amount;
  }
  return net;
}
