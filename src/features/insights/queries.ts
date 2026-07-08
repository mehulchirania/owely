import "server-only";

import { Expense } from "@/types";

export interface MonthlyInsight {
  month: string; // "YYYY-MM"
  total: number;
  byCategory: Record<string, number>;
}

function getMonthString(ms: number): string {
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** 
 * Aggregates all expenses into monthly totals by category.
 * If userUid is provided, it only aggregates the user's portion of the expenses (e.splits[uid] || 0).
 * If userUid is omitted, it aggregates the total group expense amount.
 */
export function aggregateInsights(expenses: Expense[], userUid?: string): MonthlyInsight[] {
  const map = new Map<string, MonthlyInsight>();

  for (const e of expenses) {
    const amountToCount = userUid ? (e.splits[userUid] || 0) : e.amount;
    if (amountToCount <= 0) continue;

    const monthStr = getMonthString(e.createdAt);
    if (!map.has(monthStr)) {
      map.set(monthStr, { month: monthStr, total: 0, byCategory: {} });
    }

    const monthData = map.get(monthStr)!;
    monthData.total += amountToCount;
    monthData.byCategory[e.category] = (monthData.byCategory[e.category] || 0) + amountToCount;
  }

  return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month)); // Newest first
}

export function aggregateOwnInsights(expenses: { amount: number, createdAt: number, category: string }[]): MonthlyInsight[] {
  const map = new Map<string, MonthlyInsight>();

  for (const e of expenses) {
    const amountToCount = e.amount;
    if (amountToCount <= 0) continue;

    const monthStr = getMonthString(e.createdAt);
    if (!map.has(monthStr)) {
      map.set(monthStr, { month: monthStr, total: 0, byCategory: {} });
    }

    const monthData = map.get(monthStr)!;
    monthData.total += amountToCount;
    monthData.byCategory[e.category] = (monthData.byCategory[e.category] || 0) + amountToCount;
  }

  return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month)); // Newest first
}
