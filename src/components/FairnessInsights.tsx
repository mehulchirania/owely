"use client";

import { formatPaise } from "@/lib/money";

interface Member {
  uid: string;
  name: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  createdAt: number;
}

import type { Settlement } from "@/types";

interface Props {
  members: Member[];
  expenses: Expense[];
  simplifiedDebts: Settlement[];
}

export function FairnessInsights({ members, expenses, simplifiedDebts }: Props) {
  // 1. Calculate Paying Ratio (total paid by each / total spends)
  const totalSpends = expenses.reduce((sum, e) => sum + e.amount, 0);
  const paidSums: Record<string, number> = {};
  for (const m of members) paidSums[m.uid] = 0;
  for (const e of expenses) {
    if (e.paidBy in paidSums) {
      paidSums[e.paidBy] += e.amount;
    }
  }

  const payingRatios = members.map((m) => {
    const totalPaid = paidSums[m.uid] || 0;
    const ratio = totalSpends > 0 ? (totalPaid / totalSpends) * 100 : 0;
    return {
      uid: m.uid,
      name: m.name,
      totalPaid,
      ratio,
    };
  }).sort((a, b) => b.totalPaid - a.totalPaid);

  // 2. Round-Robin suggest next payer (who paid longest ago, or never)
  const lastPaidTimes: Record<string, number> = {};
  for (const m of members) lastPaidTimes[m.uid] = 0; // 0 means never
  for (const e of expenses) {
    const time = e.createdAt;
    if (e.paidBy in lastPaidTimes) {
      if (time > lastPaidTimes[e.paidBy]) {
        lastPaidTimes[e.paidBy] = time;
      }
    }
  }

  const suggestPayeeByTime = members.map((m) => ({
    uid: m.uid,
    name: m.name,
    lastPaid: lastPaidTimes[m.uid],
  })).sort((a, b) => a.lastPaid - b.lastPaid)[0]; // Oldest first

  // 3. Suggest payee by net debt (who owes the most / has lowest net balance)
  // Calculate net balances based on simplified transfers
  const netBalances: Record<string, number> = {};
  for (const m of members) netBalances[m.uid] = 0;
  for (const debt of simplifiedDebts) {
    if (debt.from in netBalances) netBalances[debt.from] -= debt.amount;
    if (debt.to in netBalances) netBalances[debt.to] += debt.amount;
  }

  const suggestPayeeByBalance = members.map((m) => ({
    uid: m.uid,
    name: m.name,
    balance: netBalances[m.uid],
  })).sort((a, b) => a.balance - b.balance)[0]; // Lowest (most negative) first

  return (
    <div className="rounded-3xl border border-white/6 bg-card p-5 flex flex-col gap-5">
      <div>
        <h3 className="font-display text-base font-bold text-hi mb-1">
          Fairness Insights
        </h3>
        <p className="text-xs text-dim">
          Stats and suggestions to keep the ledger healthy.
        </p>
      </div>

      {/* Suggested Payees */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-surface p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-dim block mb-1">
              Who should pay next? (Round-robin)
            </span>
            <p className="text-sm font-bold text-hi">
              {suggestPayeeByTime ? suggestPayeeByTime.name : "N/A"}
            </p>
          </div>
          <p className="text-[11px] text-muted mt-2">
            {suggestPayeeByTime && suggestPayeeByTime.lastPaid > 0
              ? `Paid last on ${new Date(suggestPayeeByTime.lastPaid).toLocaleDateString()}`
              : "Has never paid an expense in this group yet."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-surface p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-dim block mb-1">
              Who owes the most? (Payee suggest)
            </span>
            <p className="text-sm font-bold text-hi">
              {suggestPayeeByBalance && suggestPayeeByBalance.balance < 0 ? suggestPayeeByBalance.name : "None"}
            </p>
          </div>
          <p className="text-[11px] text-muted mt-2">
            {suggestPayeeByBalance && suggestPayeeByBalance.balance < 0
              ? `Currently owes ${formatPaise(Math.abs(suggestPayeeByBalance.balance))} in total.`
              : "Nobody currently owes money in the group."}
          </p>
        </div>
      </div>

      {/* Contributor Spends Ratios */}
      <div className="border-t border-white/6 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-dim mb-3">
          Contribution Ratios
        </h4>
        <div className="flex flex-col gap-3">
          {payingRatios.map((pr) => (
            <div key={pr.uid} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-medium text-strong">
                <span>{pr.name}</span>
                <span>
                  {formatPaise(pr.totalPaid)} ({pr.ratio.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/4 overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${pr.ratio}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
