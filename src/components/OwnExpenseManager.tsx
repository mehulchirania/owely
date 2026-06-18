"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addOwnExpense, editOwnExpense, deleteOwnExpense } from "@/features/personal-ledger/actions";
import {
  createOwnRecurring,
  deleteRecurring,
  updateRecurring,
} from "@/features/recurring/actions";
import { formatPaise } from "@/lib/money";
import { categoryStyle } from "@/lib/categories";
import type { OwnExpense, ExpenseCategory, RecurringExpense } from "@/types";

interface Props {
  initialExpenses: OwnExpense[];
  initialRecurring: RecurringExpense[];
  userTier: "free" | "paid";
}

const CATEGORIES: ExpenseCategory[] = [
  "general", "food", "groceries", "rent", "utilities", "transport",
  "entertainment", "travel", "shopping", "health", "other",
];

export function OwnExpenseManager({
  initialExpenses,
  initialRecurring,
  userTier,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form states for creating a new expense
  const [title, setTitle] = useState("");
  const [amountRupees, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("general");

  const [recurringTitle, setRecurringTitle] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringCategory, setRecurringCategory] = useState<ExpenseCategory>("general");
  const [recurringDay, setRecurringDay] = useState(1);
  const [recurringError, setRecurringError] = useState<string | null>(null);

  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState<ExpenseCategory>("general");

  // Calculate monthly spent
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthlyExpenses = initialExpenses.filter((e) => e.createdAt >= startOfMonth);
  const monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const isPaid = userTier === "paid";

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !amountRupees.trim()) return;

    startTransition(async () => {
      const res = await addOwnExpense({
        expense: {
          title: title.trim(),
          amountRupees: amountRupees.trim(),
          category,
        },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle("");
      setAmount("");
      setCategory("general");
      router.refresh();
    });
  }

  function handleCreateRecurring(e: React.FormEvent) {
    e.preventDefault();
    setRecurringError(null);
    if (!isPaid) {
      setRecurringError("Recurring expenses are available on Owely Pro.");
      return;
    }
    if (!recurringTitle.trim() || !recurringAmount.trim()) return;

    startTransition(async () => {
      const res = await createOwnRecurring({
        dayOfMonth: recurringDay,
        expense: {
          title: recurringTitle.trim(),
          amountRupees: recurringAmount.trim(),
          category: recurringCategory,
        },
      });
      if (!res.ok) {
        setRecurringError(res.error);
        return;
      }
      setRecurringTitle("");
      setRecurringAmount("");
      setRecurringCategory("general");
      setRecurringDay(1);
      router.refresh();
    });
  }

  function setRecurringActive(recurringId: string, active: boolean) {
    setRecurringError(null);
    startTransition(async () => {
      const res = await updateRecurring({ recurringId, active });
      if (!res.ok) {
        setRecurringError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function removeRecurring(recurringId: string) {
    if (!confirm("Delete this recurring expense? Future monthly expenses will stop.")) return;
    setRecurringError(null);
    startTransition(async () => {
      const res = await deleteRecurring({ recurringId });
      if (!res.ok) {
        setRecurringError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleStartEdit(exp: OwnExpense) {
    setEditingId(exp.id);
    setEditTitle(exp.title);
    setEditAmount((exp.amount / 100).toFixed(2));
    setEditCategory(exp.category);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editTitle.trim() || !editAmount.trim()) return;

    startTransition(async () => {
      const res = await editOwnExpense({
        expenseId: editingId,
        expense: {
          title: editTitle.trim(),
          amountRupees: editAmount.trim(),
          category: editCategory,
        },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(expenseId: string) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteOwnExpense({ expenseId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Monthly summary banner */}
      <div className="rounded-2xl border border-white/6 bg-card p-5">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs text-muted font-medium uppercase tracking-[0.08em]">Spent This Month</span>
            <div className="mt-1 font-display text-2xl font-bold text-mint">
              {formatPaise(monthlyTotal)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted font-medium uppercase tracking-[0.08em]">Total Items</span>
            <div className="mt-1 font-display text-xl font-bold text-hi">
              {initialExpenses.length}
            </div>
          </div>
        </div>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="rounded-2xl border border-white/6 bg-surface p-4 flex flex-col gap-3">
        <h3 className="font-semibold text-hi text-sm">Add Private Expense</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="What was it for?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            className="rounded-lg border border-white/8 bg-card px-3 py-2 text-sm text-hi placeholder-dim outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Amount (₹)"
              value={amountRupees}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
              className="flex-1 rounded-lg border border-white/8 bg-card px-3 py-2 text-sm text-hi placeholder-dim outline-none focus:border-accent"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              disabled={pending}
              className="rounded-lg border border-white/8 bg-card px-2 py-2 text-sm text-hi outline-none focus:border-accent"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent text-sm font-semibold text-ink py-2 transition-colors hover:bg-accent/80 disabled:opacity-50"
          >
            {pending ? "Adding..." : "Add"}
          </button>
        </div>
        {error && <span className="text-xs text-coral-soft">{error}</span>}
      </form>

      <section className="rounded-2xl border border-white/6 bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-hi text-sm">Monthly Recurring</h3>
            <p className="mt-1 text-xs text-dim">
              Auto-log SIPs, insurance, rent, and subscriptions on a fixed day.
            </p>
          </div>
          {!isPaid && (
            <Link
              href="/settings"
              className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 px-4 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              View Pro
            </Link>
          )}
        </div>

        <form onSubmit={handleCreateRecurring} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_0.7fr_0.7fr_0.6fr_auto]">
          <input
            type="text"
            required
            placeholder="Mutual fund SIP"
            value={recurringTitle}
            onChange={(e) => setRecurringTitle(e.target.value)}
            disabled={pending || !isPaid}
            className="h-11 rounded-lg border border-white/8 bg-card px-3 text-sm text-hi placeholder-dim outline-none focus:border-accent disabled:opacity-60"
          />
          <input
            type="text"
            required
            inputMode="decimal"
            placeholder="Amount"
            value={recurringAmount}
            onChange={(e) => setRecurringAmount(e.target.value)}
            disabled={pending || !isPaid}
            className="h-11 rounded-lg border border-white/8 bg-card px-3 text-sm text-hi placeholder-dim outline-none focus:border-accent disabled:opacity-60"
          />
          <select
            value={recurringCategory}
            onChange={(e) => setRecurringCategory(e.target.value as ExpenseCategory)}
            disabled={pending || !isPaid}
            className="h-11 rounded-lg border border-white/8 bg-card px-2 text-sm capitalize text-hi outline-none focus:border-accent disabled:opacity-60"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={recurringDay}
            onChange={(e) => setRecurringDay(Number(e.target.value))}
            disabled={pending || !isPaid}
            className="h-11 rounded-lg border border-white/8 bg-card px-2 text-sm text-hi outline-none focus:border-accent disabled:opacity-60"
          >
            {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
              <option key={day} value={day}>
                Day {day}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending || !isPaid || recurringTitle.trim() === "" || recurringAmount.trim() === ""}
            className="flex h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-ink transition-colors hover:bg-accent/80 disabled:opacity-50"
          >
            {pending ? "Saving..." : "Create"}
          </button>
        </form>

        {recurringError && (
          <p role="alert" className="mt-3 rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-xs text-coral-soft">
            {recurringError}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {initialRecurring.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-dim">
              No monthly personal rules yet.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {initialRecurring.map((item) => (
                <li key={item.id} className="rounded-xl border border-white/6 bg-card p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-hi">{item.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.active ? "bg-mint/10 text-mint" : "bg-white/5 text-dim"}`}>
                          {item.active ? "active" : "paused"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatPaise(item.amount)} on day {item.dayOfMonth}
                        {item.lastRunMonth ? ` - last generated ${item.lastRunMonth}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setRecurringActive(item.id, !item.active)}
                        disabled={pending || !isPaid}
                        className="flex h-10 items-center justify-center rounded-lg border border-white/10 bg-surface px-3 text-xs font-semibold text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                      >
                        {item.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecurring(item.id)}
                        disabled={pending || !isPaid}
                        className="flex h-10 items-center justify-center rounded-lg border border-coral/25 bg-coral/10 px-3 text-xs font-semibold text-coral-soft transition-colors hover:bg-coral/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Expenses list */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-dim text-xs uppercase tracking-[0.08em] px-0.5">Expense History</h3>
        {initialExpenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-dim text-sm">
            No personal expenses logged yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {initialExpenses.map((exp) => {
              const cat = categoryStyle(exp.category);
              const isEditing = editingId === exp.id;

              if (isEditing) {
                return (
                  <li key={exp.id} className="rounded-xl border border-white/8 bg-card p-3">
                    <form onSubmit={handleSaveEdit} className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        disabled={pending}
                        className="flex-1 rounded-lg border border-white/8 bg-surface px-3 py-1.5 text-sm text-hi outline-none focus:border-accent"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          disabled={pending}
                          className="w-24 rounded-lg border border-white/8 bg-surface px-3 py-1.5 text-sm text-hi outline-none focus:border-accent"
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                          disabled={pending}
                          className="rounded-lg border border-white/8 bg-surface px-2 py-1.5 text-sm text-hi outline-none focus:border-accent"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="submit"
                          disabled={pending}
                          className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-accent/80 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-white/10 bg-surface px-3 py-1.5 text-xs font-semibold text-strong transition-colors hover:bg-elevated disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </li>
                );
              }

              return (
                <li
                  key={exp.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-card p-3.5 hover:bg-elevated transition-colors"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${cat.tile}`}>
                    {cat.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold text-hi truncate">{exp.title}</span>
                    <span className="text-xs text-dim capitalize">{exp.category}</span>
                  </div>
                  <span className="font-display font-semibold text-sm text-hi">
                    {formatPaise(exp.amount)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartEdit(exp)}
                      className="rounded-lg border border-white/10 bg-surface px-2.5 py-1 text-xs font-semibold text-strong transition-colors hover:bg-elevated"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="rounded-lg border border-white/10 bg-surface px-2.5 py-1 text-xs font-semibold text-coral transition-colors hover:bg-coral/10"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
