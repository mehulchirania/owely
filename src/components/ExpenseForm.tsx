"use client";

/**
 * Add / edit an expense. Accepts rupee input from the user and only ever sends
 * rupee strings + a split type to the server (the action converts to paise and
 * re-validates exact reconciliation). Reconciliation is also shown inline here
 * so the user sees a mismatch *before* submitting, never after.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPaise, rupeesToPaise, splitEqual } from "@/lib/money";
import { categoryStyle } from "@/lib/categories";
import { memberAvatar } from "@/lib/avatar";
import { addExpense, editExpense } from "@/actions/expenses";
import type { ExpenseCategory, SplitType } from "@/types";

interface Member {
  uid: string;
  name: string;
}

export interface ExpenseFormInitial {
  expenseId: string;
  title: string;
  amountRupees: string;
  paidBy: string;
  category: ExpenseCategory;
  splitType: SplitType;
  participants: string[];
  splitValues: Record<string, string>;
}

interface Props {
  groupId: string;
  members: Member[];
  currentUid: string;
  initial?: ExpenseFormInitial;
}

const CATEGORIES: ExpenseCategory[] = [
  "general", "food", "groceries", "rent", "utilities", "transport",
  "entertainment", "travel", "shopping", "health", "other",
];

const SPLIT_TABS: { value: SplitType; label: string }[] = [
  { value: "equal", label: "Equally" },
  { value: "unequal", label: "Unequally" },
  { value: "percentage", label: "By %" },
];

/** Parse a rupee string to paise without throwing — returns null on garbage. */
function safePaise(value: string): number | null {
  try {
    return rupeesToPaise(value || "0");
  } catch {
    return null;
  }
}

export function ExpenseForm({ groupId, members, currentUid, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [amountRupees, setAmount] = useState(initial?.amountRupees ?? "");
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? currentUid);
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? "general");
  const [splitType, setSplitType] = useState<SplitType>(initial?.splitType ?? "equal");
  const [participants, setParticipants] = useState<Set<string>>(
    new Set(initial?.participants ?? members.map((m) => m.uid)),
  );
  const [splitValues, setSplitValues] = useState<Record<string, string>>(
    initial?.splitValues ?? {},
  );

  const amount = safePaise(amountRupees);
  const selected = members.filter((m) => participants.has(m.uid));

  // ── Inline reconciliation ──────────────────────────────────────────────────
  // Computed every render (React Compiler memoizes); shows mismatches live.
  function computeReconcile(): { ok: boolean; note: string } {
    if (amount === null || amount <= 0 || selected.length === 0) {
      return { ok: false, note: "Enter an amount and pick who shares it." };
    }
    if (splitType === "equal") {
      const each = splitEqual(amount, selected.map((m) => m.uid));
      const preview = selected.map((m) => `${m.name}: ${formatPaise(each[m.uid])}`).join(" · ");
      return { ok: true, note: preview };
    }
    if (splitType === "unequal") {
      let sum = 0;
      for (const m of selected) {
        const p = safePaise(splitValues[m.uid] ?? "0");
        if (p === null) return { ok: false, note: "Enter valid amounts." };
        sum += p;
      }
      const diff = amount - sum;
      if (diff === 0) return { ok: true, note: "Adds up exactly. ✓" };
      return {
        ok: false,
        note: diff > 0 ? `${formatPaise(diff)} left to assign.` : `${formatPaise(-diff)} over the total.`,
      };
    }
    // percentage
    let pct = 0;
    for (const m of selected) {
      const v = Number(splitValues[m.uid] ?? "0");
      if (!Number.isFinite(v) || v < 0) return { ok: false, note: "Enter valid percentages." };
      pct += v;
    }
    const rounded = Math.round(pct * 100) / 100;
    if (rounded === 100) return { ok: true, note: "Adds up to 100%. ✓" };
    return { ok: false, note: `Currently ${rounded}% — must total 100%.` };
  }
  const reconcile = computeReconcile();

  function toggle(uid: string): void {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function setValue(uid: string, value: string): void {
    setSplitValues((prev) => ({ ...prev, [uid]: value }));
  }

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);
    if (!reconcile.ok) {
      setError(reconcile.note);
      return;
    }
    const payload = {
      groupId,
      expense: {
        title,
        amountRupees,
        paidBy,
        category,
        splitType,
        participants: selected.map((m) => m.uid),
        splitValues: splitType === "equal" ? undefined : splitValues,
      },
    };
    startTransition(async () => {
      const res = initial
        ? await editExpense({ ...payload, expenseId: initial.expenseId })
        : await addExpense(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/groups/${groupId}`);
      router.refresh();
    });
  }

  const cat = categoryStyle(category);

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* big amount */}
      <div className="flex flex-col items-center gap-1 pt-2 pb-1">
        <span className="text-xs uppercase tracking-[0.04em] text-dim">Amount in ₹</span>
        <div className="flex items-start gap-1">
          <span className="mt-3 font-display text-3xl font-medium text-dim">₹</span>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amountRupees}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
            disabled={pending}
            aria-label="Amount in rupees"
            size={6}
            className="w-auto min-w-[2ch] bg-transparent text-center font-display text-[58px] font-bold leading-none tracking-tight text-hi caret-accent outline-none placeholder:text-faint"
          />
        </div>
      </div>

      {/* description + category */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/6 bg-card px-4">
        <span className="text-lg" aria-hidden>📝</span>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What was it for?"
          maxLength={120}
          required
          disabled={pending}
          aria-label="Description"
          className="h-13 min-w-0 flex-1 bg-transparent text-[15px] text-hi outline-none placeholder:text-faint"
        />
        <label className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${cat.tile} ${cat.text}`}>
          <span aria-hidden>{cat.emoji}</span>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            disabled={pending}
            aria-label="Category"
            className="cursor-pointer appearance-none bg-transparent capitalize text-current outline-none [&>option]:bg-surface [&>option]:text-hi"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      {/* paid by */}
      <div className="flex flex-col gap-2">
        <span className="px-0.5 text-[13px] text-dim">Paid by</span>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const on = paidBy === m.uid;
            const a = memberAvatar(m.uid);
            return (
              <button
                key={m.uid}
                type="button"
                onClick={() => setPaidBy(m.uid)}
                disabled={pending}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-1.5 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  on
                    ? "border-[1.5px] border-accent bg-accent/15 font-semibold text-hi"
                    : "border border-white/6 bg-card text-muted"
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full font-display text-xs font-semibold ${a.bg} ${a.fg}`}>
                  {(m.uid === currentUid ? "Y" : m.name).charAt(0).toUpperCase()}
                </span>
                {m.uid === currentUid ? "You" : m.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* split type segmented */}
      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label="Split type" className="flex gap-1 rounded-2xl bg-card p-1">
          {SPLIT_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={splitType === tab.value}
              onClick={() => setSplitType(tab.value)}
              disabled={pending}
              className={`h-9 flex-1 rounded-xl text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                splitType === tab.value
                  ? "bg-accent text-white"
                  : "text-dim hover:text-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ul className="flex flex-col gap-1.5">
          {members.map((m) => {
            const isOn = participants.has(m.uid);
            const a = memberAvatar(m.uid);
            const each = isOn && splitType === "equal" && reconcile.ok
              ? splitEqual(amount ?? 0, selected.map((s) => s.uid))[m.uid]
              : null;
            return (
              <li key={m.uid} className={`flex items-center gap-3 px-0.5 py-1 ${isOn ? "" : "opacity-45"}`}>
                <button
                  type="button"
                  onClick={() => toggle(m.uid)}
                  disabled={pending}
                  role="checkbox"
                  aria-checked={isOn}
                  aria-label={`Include ${m.uid === currentUid ? "you" : m.name}`}
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    isOn ? "bg-accent" : "border-[1.5px] border-faint"
                  }`}
                >
                  {isOn && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold ${a.bg} ${a.fg}`}>
                  {(m.uid === currentUid ? "Y" : m.name).charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 text-sm text-hi">{m.uid === currentUid ? "You" : m.name}</span>
                {!isOn ? (
                  <span className="text-[13px] text-faint">—</span>
                ) : splitType === "unequal" ? (
                  <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-card px-2">
                    <span className="text-dim">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={splitValues[m.uid] ?? ""}
                      onChange={(e) => setValue(m.uid, e.target.value)}
                      placeholder="0.00"
                      disabled={pending}
                      aria-label={`Amount for ${m.name}`}
                      className="h-9 w-20 bg-transparent text-right text-hi outline-none"
                    />
                  </div>
                ) : splitType === "percentage" ? (
                  <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-card px-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={splitValues[m.uid] ?? ""}
                      onChange={(e) => setValue(m.uid, e.target.value)}
                      placeholder="0"
                      disabled={pending}
                      aria-label={`Percentage for ${m.name}`}
                      className="h-9 w-12 bg-transparent text-right text-hi outline-none"
                    />
                    <span className="text-dim">%</span>
                  </div>
                ) : (
                  <span className="font-display text-sm font-semibold text-strong">
                    {each !== null ? formatPaise(each) : "—"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral-soft">
          {error}
        </p>
      )}

      {/* reconcile + CTA */}
      <div className="flex flex-col gap-3">
        <div className={`flex items-center justify-center gap-1.5 text-[13px] font-semibold ${reconcile.ok ? "text-mint" : "text-cat-yellow"}`}>
          {reconcile.ok && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          )}
          {reconcile.note}
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || !reconcile.ok || title.trim() === ""}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-white shadow-[0_14px_32px_-10px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
          >
            {pending ? "Saving…" : initial ? "Save changes" : "Add expense"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={pending}
            className="flex h-14 items-center justify-center rounded-2xl border border-white/8 px-5 font-semibold text-strong transition-colors hover:bg-card"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
