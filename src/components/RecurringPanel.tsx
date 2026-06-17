"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createSharedRecurring,
  deleteRecurring,
  updateRecurring,
} from "@/features/recurring/actions";
import { formatPaise } from "@/lib/money";
import { memberAvatar } from "@/lib/avatar";
import type { ExpenseCategory, RecurringExpense } from "@/types";

interface Member {
  uid: string;
  name: string;
}

interface Props {
  groupId: string;
  members: Member[];
  currentUid: string;
  userTier: "free" | "paid";
  recurring: RecurringExpense[];
}

const CATEGORIES: ExpenseCategory[] = [
  "general",
  "food",
  "groceries",
  "rent",
  "utilities",
  "transport",
  "entertainment",
  "travel",
  "shopping",
  "health",
  "other",
];

function memberName(members: Member[], uid?: string): string {
  if (!uid) return "Someone";
  return members.find((member) => member.uid === uid)?.name ?? "Someone";
}

export function RecurringPanel({
  groupId,
  members,
  currentUid,
  userTier,
  recurring,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [paidBy, setPaidBy] = useState(currentUid);
  const [category, setCategory] = useState<ExpenseCategory>("general");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [participants, setParticipants] = useState<Set<string>>(
    new Set(members.map((member) => member.uid)),
  );
  const [error, setError] = useState<string | null>(null);

  const isPaid = userTier === "paid";
  const selected = members.filter((member) => participants.has(member.uid));

  function toggleParticipant(uid: string): void {
    setParticipants((previous) => {
      const next = new Set(previous);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    setError(null);
    if (!isPaid) {
      setError("Recurring expenses are available on Owely Pro.");
      return;
    }
    if (selected.length === 0) {
      setError("Pick at least one participant.");
      return;
    }

    startTransition(async () => {
      const result = await createSharedRecurring({
        groupId,
        dayOfMonth,
        expense: {
          title,
          amountRupees,
          paidBy,
          category,
          splitType: "equal",
          participants: selected.map((member) => member.uid),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setAmountRupees("");
      setCategory("general");
      setDayOfMonth(1);
      setParticipants(new Set(members.map((member) => member.uid)));
      router.refresh();
    });
  }

  function setActive(recurringId: string, active: boolean): void {
    setError(null);
    startTransition(async () => {
      const result = await updateRecurring({ recurringId, active });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(recurringId: string): void {
    if (!confirm("Delete this recurring expense? Future monthly expenses will stop.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteRecurring({ recurringId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-3xl border border-white/6 bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-hi">
              Monthly recurring expenses
            </h2>
            <p className="mt-1 text-sm leading-6 text-dim">
              Create an equal-split expense that Owely generates once per month.
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

        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr]">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">
                Title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Rent, Wi-Fi, cook, subscription"
                maxLength={120}
                required
                disabled={pending || !isPaid}
                className="h-12 rounded-xl border border-white/8 bg-surface px-3 text-hi outline-none placeholder:text-faint focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-60"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">
                Amount
              </span>
              <input
                value={amountRupees}
                onChange={(event) => setAmountRupees(event.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                required
                disabled={pending || !isPaid}
                className="h-12 rounded-xl border border-white/8 bg-surface px-3 text-hi outline-none placeholder:text-faint focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-60"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">
                Generate on
              </span>
              <select
                value={dayOfMonth}
                onChange={(event) => setDayOfMonth(Number(event.target.value))}
                disabled={pending || !isPaid}
                className="h-12 rounded-xl border border-white/8 bg-surface px-3 text-hi outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-60"
              >
                {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                  <option key={day} value={day}>
                    Day {day}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">
                Paid by
              </span>
              <select
                value={paidBy}
                onChange={(event) => setPaidBy(event.target.value)}
                disabled={pending || !isPaid}
                className="h-12 rounded-xl border border-white/8 bg-surface px-3 text-hi outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-60"
              >
                {members.map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {member.uid === currentUid ? "You" : member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">
                Category
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
                disabled={pending || !isPaid}
                className="h-12 rounded-xl border border-white/8 bg-surface px-3 capitalize text-hi outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-60"
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">
              Split equally between
            </span>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const active = participants.has(member.uid);
                const avatar = memberAvatar(member.uid);
                return (
                  <button
                    key={member.uid}
                    type="button"
                    onClick={() => toggleParticipant(member.uid)}
                    disabled={pending || !isPaid}
                    aria-pressed={active}
                    className={`flex min-h-11 items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ${
                      active
                        ? "border-accent bg-accent/15 font-semibold text-ink"
                        : "border-white/8 bg-surface text-muted"
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-semibold ${avatar.bg} ${avatar.fg}`}>
                      {(member.uid === currentUid ? "Y" : member.name).charAt(0).toUpperCase()}
                    </span>
                    {member.uid === currentUid ? "You" : member.name}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-2xl border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral-soft">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !isPaid || title.trim() === "" || amountRupees.trim() === ""}
            className="flex h-12 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-ink shadow-[0_14px_32px_-10px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Create monthly expense"}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">
          Saved rules
        </h2>
        {recurring.length === 0 ? (
          <div className="rounded-2xl border border-white/6 bg-card px-5 py-8 text-center">
            <p className="font-semibold text-hi">No recurring expenses yet</p>
            <p className="mt-1 text-sm text-dim">
              Monthly rent, Wi-Fi, helpers, or subscriptions can live here.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {recurring.map((item) => (
              <li key={item.id} className="rounded-2xl border border-white/6 bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-hi">{item.title}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.active ? "bg-mint/10 text-mint" : "bg-white/5 text-dim"}`}>
                        {item.active ? "active" : "paused"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {formatPaise(item.amount)} on day {item.dayOfMonth} - paid by{" "}
                      {memberName(members, item.paidBy)}
                    </p>
                    {item.lastRunMonth && (
                      <p className="mt-1 text-xs text-dim">
                        Last generated {item.lastRunMonth}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setActive(item.id, !item.active)}
                      disabled={pending || !isPaid}
                      className="flex h-10 items-center justify-center rounded-xl border border-white/8 px-3 text-sm font-semibold text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                    >
                      {item.active ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      disabled={pending || !isPaid}
                      className="flex h-10 items-center justify-center rounded-xl border border-coral/25 bg-coral/10 px-3 text-sm font-semibold text-coral-soft transition-colors hover:bg-coral/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
