"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addBatchExpenses } from "@/features/expenses/actions";
import type { ExpenseCategory } from "@/types";

interface Member {
  uid: string;
  name: string;
}

interface Props {
  groupId: string;
  members: Member[];
  currentUid: string;
}

interface BatchRow {
  title: string;
  amountRupees: string;
  paidBy: string;
  category: ExpenseCategory;
  participants: Set<string>;
}

const CATEGORIES: ExpenseCategory[] = [
  "general", "food", "groceries", "rent", "utilities", "transport",
  "entertainment", "travel", "shopping", "health", "other",
];

export function BatchExpenseForm({ groupId, members, currentUid }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<BatchRow[]>([
    {
      title: "",
      amountRupees: "",
      paidBy: currentUid,
      category: "general",
      participants: new Set(members.map((m) => m.uid)),
    },
  ]);

  const addRow = () => {
    setRows([
      ...rows,
      {
        title: "",
        amountRupees: "",
        paidBy: currentUid,
        category: "general",
        participants: new Set(members.map((m) => m.uid)),
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, fields: Partial<BatchRow>) => {
    setRows(
      rows.map((row, i) => {
        if (i === index) {
          return { ...row, ...fields };
        }
        return row;
      }),
    );
  };

  const toggleParticipant = (rowIndex: number, memberUid: string) => {
    const row = rows[rowIndex];
    const newParticipants = new Set(row.participants);
    if (newParticipants.has(memberUid)) {
      if (newParticipants.size > 1) {
        newParticipants.delete(memberUid);
      }
    } else {
      newParticipants.add(memberUid);
    }
    updateRow(rowIndex, { participants: newParticipants });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.title.trim()) {
        setError(`Row ${i + 1}: Description is required.`);
        return;
      }
      const amt = parseFloat(row.amountRupees);
      if (isNaN(amt) || amt <= 0) {
        setError(`Row ${i + 1}: Amount must be a positive number.`);
        return;
      }
      if (row.participants.size === 0) {
        setError(`Row ${i + 1}: Pick at least one person to split with.`);
        return;
      }
    }

    startTransition(async () => {
      const payload = {
        groupId,
        expenses: rows.map((r) => ({
          title: r.title.trim(),
          amountRupees: r.amountRupees.trim(),
          paidBy: r.paidBy,
          category: r.category,
          splitType: "equal" as const,
          participants: Array.from(r.participants),
        })),
      };

      const res = await addBatchExpenses(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }

      router.push(`/groups/${groupId}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <div
            key={index}
            className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-card p-4 transition-all hover:border-white/12"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-dim">
                Expense #{index + 1}
              </span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-surface text-destructive transition-colors hover:bg-elevated"
                  aria-label="Remove row"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dim mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Taxi, Lunch, Hotel"
                  value={row.title}
                  onChange={(e) => updateRow(index, { title: e.target.value })}
                  className="w-full h-11 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi placeholder-faint transition-all focus:border-accent focus:outline-none"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dim mb-1">
                  Amount (₹)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0.00"
                  value={row.amountRupees}
                  onChange={(e) => updateRow(index, { amountRupees: e.target.value })}
                  className="w-full h-11 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi placeholder-faint transition-all focus:border-accent focus:outline-none"
                />
              </div>

              {/* Paid By */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dim mb-1">
                  Paid By
                </label>
                <select
                  value={row.paidBy}
                  onChange={(e) => updateRow(index, { paidBy: e.target.value })}
                  className="w-full h-11 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi transition-all focus:border-accent focus:outline-none"
                >
                  {members.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dim mb-1">
                  Category
                </label>
                <select
                  value={row.category}
                  onChange={(e) => updateRow(index, { category: e.target.value as ExpenseCategory })}
                  className="w-full h-11 rounded-xl border border-white/8 bg-surface px-3 text-sm text-hi transition-all focus:border-accent focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Split With */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-dim mb-2">
                Split With (equally)
              </label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const isChecked = row.participants.has(m.uid);
                  return (
                    <button
                      key={m.uid}
                      type="button"
                      onClick={() => toggleParticipant(index, m.uid)}
                      className={`min-h-[44px] px-3 rounded-xl border text-[13px] font-semibold transition-colors flex items-center gap-1.5 ${
                        isChecked
                          ? "border-accent bg-accent/15 text-ink"
                          : "border-white/8 bg-card text-muted"
                      }`}
                    >
                      {isChecked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={addRow}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/8 bg-card px-4 text-sm font-semibold text-strong transition-colors hover:bg-elevated"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add another row
        </button>

        <div className="flex gap-3">
          <Link
            href={`/groups/${groupId}`}
            className="flex h-11 items-center justify-center rounded-xl border border-white/8 bg-surface px-4 text-sm font-semibold text-strong transition-colors hover:bg-elevated"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 sm:flex-none h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-fg transition-all hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>
    </form>
  );
}
