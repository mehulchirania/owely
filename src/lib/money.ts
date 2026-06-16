/**
 * Money utilities. Everything here operates on integer **paise**.
 *
 * The central invariant for every split function: the returned per-member
 * paise values MUST sum back to the exact input total. We never let rounding
 * silently lose or invent a paisa. Remainders are distributed
 * deterministically (largest-remainder method) so results are stable across
 * recomputes and identical on server and client.
 */

import type { Paise, Uid } from "@/types";

/** Format paise as a display string, e.g. 123450 -> "₹1,234.50". */
export function formatPaise(paise: Paise): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.trunc(abs / 100);
  const remainder = abs % 100;
  const grouped = rupees.toLocaleString("en-IN");
  return `${sign}₹${grouped}.${remainder.toString().padStart(2, "0")}`;
}

/**
 * Parse a rupee amount into integer paise.
 *
 * Strings are treated as untrusted user input: validated strictly, rejecting
 * anything with sub-paise precision. Numbers are treated as already-computed
 * rupee values and rounded to the nearest paise — this absorbs IEEE-754 drift
 * like `0.1 + 0.2` rather than throwing on it.
 */
export function rupeesToPaise(input: string | number): Paise {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      throw new Error(`Invalid rupee amount: ${input}`);
    }
    return Math.round(input * 100);
  }
  const normalized = input.replace(/[,₹\s]/g, "");
  if (normalized === "" || !/^-?\d*(\.\d{0,2})?$/.test(normalized)) {
    throw new Error(`Invalid rupee amount: "${input}"`);
  }
  // Build from string parts to avoid float drift: 19.99 * 100 === 1998.9999…
  const negative = normalized.startsWith("-");
  const [whole, frac = ""] = normalized.replace("-", "").split(".");
  const paise = Number(whole || "0") * 100 + Number(frac.padEnd(2, "0"));
  return negative ? -paise : paise;
}

/**
 * Split `total` paise across `members` as evenly as possible.
 *
 * Guarantees:
 *  - Every member gets `floor(total / n)`.
 *  - The leftover `total % n` paise are handed out one each to the first
 *    `remainder` members (by their order in `members`), so the result is
 *    deterministic and sums exactly to `total`.
 *
 * Throws on an empty member list — a split with no participants is a bug,
 * not a zero-result.
 */
export function splitEqual(total: Paise, members: Uid[]): Record<Uid, Paise> {
  assertInteger(total, "total");
  if (members.length === 0) {
    throw new Error("splitEqual: cannot split across zero members");
  }
  const n = members.length;
  const base = Math.trunc(total / n);
  let remainder = total - base * n; // signed; preserves negatives correctly

  const out: Record<Uid, Paise> = {};
  const step = remainder >= 0 ? 1 : -1;
  remainder = Math.abs(remainder);
  for (let i = 0; i < n; i++) {
    out[members[i]] = base + (i < remainder ? step : 0);
  }
  return out;
}

/**
 * Split `total` paise by integer **basis points** weights (or any positive
 * integer weights). Used for percentage and ratio splits. Weights need not be
 * normalised; only their relative size matters.
 *
 * Largest-remainder method: each member gets the floor of their exact share,
 * then leftover paise go to the members with the largest fractional parts.
 * Sums exactly to `total`.
 */
export function splitByWeights(
  total: Paise,
  weights: Record<Uid, number>,
): Record<Uid, Paise> {
  assertInteger(total, "total");
  const entries = Object.entries(weights);
  if (entries.length === 0) {
    throw new Error("splitByWeights: cannot split across zero members");
  }
  const weightSum = entries.reduce((s, [, w]) => s + w, 0);
  if (weightSum <= 0) {
    throw new Error("splitByWeights: weights must sum to a positive number");
  }

  const provisional = entries.map(([uid, w]) => {
    const exact = (total * w) / weightSum;
    const floor = Math.floor(exact);
    return { uid, floor, frac: exact - floor };
  });

  const distributed = provisional.reduce((s, p) => s + p.floor, 0);
  let leftover = total - distributed;

  // Hand leftover paise to the largest fractional remainders first.
  provisional.sort((a, b) => b.frac - a.frac);
  const out: Record<Uid, Paise> = {};
  for (const p of provisional) {
    out[p.uid] = p.floor + (leftover > 0 ? 1 : 0);
    if (leftover > 0) leftover--;
  }
  return out;
}

/**
 * Validate an explicit (unequal) split: all values integer paise and summing
 * exactly to `total`. Returns the split unchanged on success; throws otherwise.
 */
export function assertExactSplit(
  total: Paise,
  splits: Record<Uid, Paise>,
): Record<Uid, Paise> {
  const sum = Object.values(splits).reduce((s, v) => {
    assertInteger(v, "split value");
    return s + v;
  }, 0);
  if (sum !== total) {
    throw new Error(
      `Split must sum to ${total} paise but summed to ${sum} (off by ${total - sum})`,
    );
  }
  return splits;
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer number of paise, got ${value}`);
  }
}
