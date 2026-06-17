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
import { deleteExpense } from "@/actions/expenses";
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

  return (
    <ul className="flex flex-col gap-1">
      {expenses.map((e) => {
        const myShare = e.splits[currentUid] ?? 0;
        const iPaid = e.paidBy === currentUid;
        const lent = e.amount - myShare;
        const cat = categoryStyle(e.category);
        return (
          <li key={e.id} className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-card">
            <span
              className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] text-xl ${cat.tile}`}
              role="img"
              aria-hidden
            >
              {cat.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-hi">{e.title}</p>
              <p className="text-xs text-dim">
                {nameOf(e.paidBy)} paid · {formatPaise(e.amount)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {iPaid && lent > 0 ? (
                <>
                  <div className="text-[11px] text-mint-soft">you lent</div>
                  <div className="font-display text-sm font-semibold text-mint">{formatPaise(lent)}</div>
                </>
              ) : !iPaid && myShare > 0 ? (
                <>
                  <div className="text-[11px] text-coral-soft">you owe</div>
                  <div className="font-display text-sm font-semibold text-coral">{formatPaise(myShare)}</div>
                </>
              ) : (
                <div className="text-[11px] text-faint">not involved</div>
              )}
            </div>
            {!currentUid.startsWith("guest_") && (
              <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <a
                  href={`/groups/${groupId}/expenses/${e.id}/edit`}
                  aria-label={`Edit ${e.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-dim hover:bg-elevated hover:text-strong focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  ✎
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(e.id)}
                  disabled={pendingId === e.id}
                  aria-label={`Delete ${e.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-dim hover:bg-coral/10 hover:text-coral focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                >
                  {pendingId === e.id ? "…" : "🗑"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
