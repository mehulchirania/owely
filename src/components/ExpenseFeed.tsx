"use client";

/**
 * Live expense feed. Renders the server-fetched `initialExpenses` immediately
 * (fast first paint, works offline), then subscribes via the client SDK so
 * adds/edits/deletes from any device appear in realtime. The client SDK can
 * only read (rules deny writes) — deletes go through the `deleteExpense`
 * Server Action.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { paths } from "@/lib/firebase/collections";
import { formatPaise } from "@/lib/money";
import { categoryStyle } from "@/lib/categories";
import { deleteExpense } from "@/features/expenses/actions";
import type { Expense } from "@/types";

interface Props {
  groupId: string;
  currentUid: string;
  memberNames: Record<string, string>;
  initialExpenses: Expense[];
}

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : typeof value === "number" ? value : 0;
}

export function ExpenseFeed({ groupId, currentUid, memberNames, initialExpenses }: Props) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const q = query(
      collection(getFirebaseDb(), paths.expenses(groupId)),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setExpenses(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              groupId,
              title: data.title ?? "",
              amount: data.amount ?? 0,
              currency: data.currency ?? "INR",
              paidBy: data.paidBy,
              splits: data.splits ?? {},
              category: data.category ?? "general",
              receiptURL: data.receiptURL,
              createdBy: data.createdBy,
              createdAt: toMillis(data.createdAt),
              updatedAt: toMillis(data.updatedAt),
              isRecurring: data.isRecurring ?? false,
              recurrenceRule: data.recurrenceRule,
            } satisfies Expense;
          }),
        );
      },
      () => {
        // Permission/offline error — keep showing the last good list.
      },
    );
    return unsub;
  }, [groupId]);

  function nameOf(uid: string): string {
    return uid === currentUid ? "You" : (memberNames[uid] ?? "Someone");
  }

  function handleDelete(expenseId: string): void {
    if (!confirm("Delete this expense? Balances will be recalculated.")) return;
    setPendingId(expenseId);
    startTransition(async () => {
      const res = await deleteExpense({ groupId, expenseId });
      setPendingId(null);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
        <span className="text-3xl" role="img" aria-label="receipt">🧾</span>
        <p className="font-medium text-strong">No expenses yet</p>
        <p className="text-sm text-dim">Add the first expense to start splitting.</p>
      </div>
    );
  }

  function formatDayHeader(ms: number) {
    const d = new Date(ms);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
  }

  const grouped: Record<string, Expense[]> = {};
  for (const e of expenses) {
    const day = formatDayHeader(e.createdAt);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(e);
  }

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(grouped).map(([day, dayExpenses]) => (
        <div key={day} className="flex flex-col gap-2.5">
          <h3 className="px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-faint">
            {day}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {dayExpenses.map((e) => {
              const myShare = e.splits[currentUid] ?? 0;
              const iPaid = e.paidBy === currentUid;
              const lent = e.amount - myShare;
              const cat = categoryStyle(e.category);
              
              let phrasing = `${nameOf(e.paidBy)} paid ${formatPaise(e.amount)}`;
              if (iPaid && lent > 0) phrasing += ` · you lent ${formatPaise(lent)}`;
              else if (!iPaid && myShare > 0) phrasing += ` · you owe ${formatPaise(myShare)}`;
              else if (!iPaid && myShare === 0) phrasing += ` · not involved`;

              return (
                <li key={e.id} className="group relative flex items-center gap-3.5 rounded-2xl border border-white/4 bg-card px-3 py-3 transition-colors hover:bg-elevated">
                  <span
                    className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] text-[20px] shadow-sm ${cat.tile}`}
                    role="img"
                    aria-hidden
                  >
                    {cat.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-hi">{e.title}</p>
                    <p className="truncate text-[12px] font-medium text-dim">
                      {phrasing}
                    </p>
                  </div>
                  
                  {/* Amount / net effect visual right side */}
                  <div className="shrink-0 text-right pr-1">
                    {iPaid && lent > 0 ? (
                      <span className="font-display text-[15px] font-bold text-mint">+{formatPaise(lent)}</span>
                    ) : !iPaid && myShare > 0 ? (
                      <span className="font-display text-[15px] font-bold text-coral">−{formatPaise(myShare)}</span>
                    ) : (
                      <span className="font-display text-[15px] font-semibold text-faint">{formatPaise(e.amount)}</span>
                    )}
                  </div>

                  {!currentUid.startsWith("guest_") && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-elevated/90 px-2 py-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-within:opacity-100 rounded-xl border border-white/10 shadow-sm">
                      <a
                        href={`/groups/${groupId}/expenses/${e.id}/edit`}
                        aria-label={`Edit ${e.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-dim hover:bg-surface hover:text-strong focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        ✎
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(e.id)}
                        disabled={pendingId === e.id}
                        aria-label={`Delete ${e.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-dim hover:bg-coral/15 hover:text-coral focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                      >
                        {pendingId === e.id ? "…" : "🗑"}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
