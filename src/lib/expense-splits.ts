/**
 * Turn validated expense input + a group into reconciled integer-paise splits.
 * Pure (no React, no Firebase) so both the expense action and the recurring
 * generator build splits identically. A returned `ok:true` guarantees the
 * splits sum exactly to the amount (`assertExactSplit` ran).
 */

import {
  assertExactSplit,
  rupeesToPaise,
  splitByWeights,
  splitEqual,
} from "@/lib/money";
import type { ExpenseInput } from "@/lib/validation";
import type { Group, Paise } from "@/types";

export type SplitResult =
  | { ok: true; amount: Paise; splits: Record<string, Paise> }
  | { ok: false; error: string };

export function computeSplits(input: ExpenseInput, group: Group): SplitResult {
  // Participants must be distinct members of the group; payer must be a member.
  const participants = Array.from(new Set(input.participants));
  if (participants.some((p) => !group.members.includes(p))) {
    return { ok: false, error: "A selected person isn't in this group." };
  }
  if (!group.members.includes(input.paidBy)) {
    return { ok: false, error: "The payer isn't in this group." };
  }

  let amount: Paise;
  try {
    amount = rupeesToPaise(input.amountRupees);
  } catch {
    return { ok: false, error: "Enter a valid amount." };
  }
  if (amount <= 0) return { ok: false, error: "Amount must be greater than zero." };

  try {
    if (input.splitType === "equal") {
      return { ok: true, amount, splits: splitEqual(amount, participants) };
    }

    if (input.splitType === "unequal") {
      const splits: Record<string, Paise> = {};
      for (const uid of participants) {
        const raw = input.splitValues?.[uid];
        splits[uid] = rupeesToPaise(typeof raw === "number" ? raw : String(raw ?? "0"));
      }
      assertExactSplit(amount, splits);
      return { ok: true, amount, splits };
    }

    // percentage: convert each percent to integer basis points; must total 100%.
    const weights: Record<string, number> = {};
    let bpsTotal = 0;
    for (const uid of participants) {
      const raw = input.splitValues?.[uid];
      const percent = typeof raw === "number" ? raw : Number(raw ?? 0);
      if (!Number.isFinite(percent) || percent < 0) {
        return { ok: false, error: "Percentages must be zero or more." };
      }
      const bps = Math.round(percent * 100);
      weights[uid] = bps;
      bpsTotal += bps;
    }
    if (bpsTotal !== 10000) {
      return { ok: false, error: "Percentages must add up to exactly 100%." };
    }
    const splits = splitByWeights(amount, weights);
    assertExactSplit(amount, splits);
    return { ok: true, amount, splits };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Split doesn't add up to the total.",
    };
  }
}
