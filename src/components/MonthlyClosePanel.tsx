"use client";

import { useState, useTransition } from "react";
import { closeMonth } from "@/features/groups/closures";
import { formatPaise } from "@/lib/money";
import type { MonthlyClosure } from "@/types";

interface Member {
  uid: string;
  name: string;
}

interface Props {
  groupId: string;
  members: Member[];
  initialClosures: MonthlyClosure[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthlyClosePanel({ groupId, members, initialClosures }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Cast initialClosures to typed data
  const closures = [...initialClosures].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const handleCloseMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const confirmMsg = `Are you sure you want to freeze ${MONTHS[selectedMonth - 1]} ${selectedYear}? Once closed, no new expenses or settlements can be added or modified in or before this month.`;
    if (!window.confirm(confirmMsg)) return;

    startTransition(async () => {
      const res = await closeMonth({
        groupId,
        month: selectedMonth,
        year: selectedYear,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Close a Month Card */}
      <div className="rounded-3xl border border-white/6 bg-card p-5">
        <h3 className="font-display text-base font-bold text-hi mb-1">
          Close a Month
        </h3>
        <p className="text-xs text-dim mb-4">
          Freezing a month locks all expenses and settlements in or before that month, and carries pending balances forward.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleCloseMonth} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-dim mb-1">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full h-11 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi focus:border-accent focus:outline-none"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-32">
            <label className="block text-xs font-semibold uppercase tracking-wider text-dim mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full h-11 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi focus:border-accent focus:outline-none"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-fg transition-all hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {pending ? "Closing..." : "Close Month"}
          </button>
        </form>
      </div>

      {/* Closed Months List */}
      <div className="rounded-3xl border border-white/6 bg-card p-5">
        <h3 className="font-display text-base font-bold text-hi mb-4">
          Closed Months
        </h3>

        {closures.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            No closed months yet. Everything is active!
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {closures.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-white/8 bg-surface p-4 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-display text-sm font-bold text-hi">
                      {MONTHS[c.month - 1]} {c.year}
                    </h4>
                    <p className="text-[11px] text-faint">
                      Closed on {new Date(c.closedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    Locked
                  </span>
                </div>

                <div className="border-t border-white/4 pt-2">
                  <p className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-2">
                    Carry Forward Balances
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {members.map((m) => {
                      const bal = c.carryForward[m.uid] ?? 0;
                      return (
                        <div key={m.uid} className="flex flex-col">
                          <span className="text-xs text-muted truncate">{m.name}</span>
                          <span
                            className={`text-xs font-semibold ${
                              bal > 0
                                ? "text-emerald-400"
                                : bal < 0
                                ? "text-rose-400"
                                : "text-muted"
                            }`}
                          >
                            {bal > 0 ? "+" : ""}
                            {formatPaise(bal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
