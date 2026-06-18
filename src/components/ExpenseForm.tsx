"use client";

/**
 * Add / edit an expense. Accepts rupee input from the user and only ever sends
 * rupee strings + a split type to the server (the action converts to paise and
 * re-validates exact reconciliation). Reconciliation is also shown inline here
 * so the user sees a mismatch *before* submitting, never after.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPaise, rupeesToPaise, splitEqual } from "@/lib/money";
import { categoryStyle } from "@/lib/categories";
import { memberAvatar } from "@/lib/avatar";
import { addExpense, editExpense } from "@/features/expenses/actions";
import { createTemplate, deleteTemplate } from "@/features/templates/actions";
import type { ExpenseCategory, SplitTemplate, SplitType } from "@/types";

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
  userTier: "free" | "paid";
  initial?: ExpenseFormInitial;
  templates?: SplitTemplate[];
}

interface ReceiptOcrResponse {
  error?: string;
  code?: string;
  title?: string;
  merchant?: string;
  amountRupees?: string;
  date?: string;
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

function readOcrResponse(value: unknown): ReceiptOcrResponse {
  if (!value || typeof value !== "object") return {};
  const data = value as Record<string, unknown>;
  return {
    error: typeof data.error === "string" ? data.error : undefined,
    code: typeof data.code === "string" ? data.code : undefined,
    title: typeof data.title === "string" ? data.title : undefined,
    merchant: typeof data.merchant === "string" ? data.merchant : undefined,
    amountRupees: typeof data.amountRupees === "string" ? data.amountRupees : undefined,
    date: typeof data.date === "string" ? data.date : undefined,
  };
}

export function ExpenseForm({ groupId, members, currentUid, userTier, initial, templates = [] }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [localTemplates, setLocalTemplates] = useState<SplitTemplate[]>(templates);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateSavedMsg, setTemplateSavedMsg] = useState<string | null>(null);

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

  function applyTemplate(t: SplitTemplate): void {
    setSplitType(t.splitType);
    setParticipants(new Set(t.participants));
    if (t.splitType === "percentage" && t.weights) {
      const vals: Record<string, string> = {};
      for (const uid of t.participants) {
        vals[uid] = String((t.weights[uid] ?? 0) / 100);
      }
      setSplitValues(vals);
    } else {
      setSplitValues({});
    }
  }

  async function handleSaveTemplate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!saveTemplateName.trim() || splitType === "unequal") return;
    setSavingTemplate(true);
    setTemplateSavedMsg(null);
    const weights: Record<string, number> = {};
    if (splitType === "percentage") {
      for (const uid of selected.map((m) => m.uid)) {
        weights[uid] = Math.round(parseFloat(splitValues[uid] ?? "0") * 100);
      }
    }
    const res = await createTemplate({
      groupId,
      name: saveTemplateName.trim(),
      splitType,
      participants: selected.map((m) => m.uid),
      ...(splitType === "percentage" ? { weights } : {}),
    });
    setSavingTemplate(false);
    if (res.ok) {
      setLocalTemplates((prev) => [
        ...prev,
        {
          id: res.data.templateId,
          ownerUid: currentUid,
          groupId,
          name: saveTemplateName.trim(),
          splitType,
          participants: selected.map((m) => m.uid),
          ...(splitType === "percentage" ? { weights } : {}),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);
      setSaveTemplateName("");
      setShowSaveForm(false);
      setTemplateSavedMsg(`Template "${saveTemplateName.trim()}" saved.`);
      setTimeout(() => setTemplateSavedMsg(null), 3000);
    }
  }

  async function handleDeleteTemplate(templateId: string): Promise<void> {
    await deleteTemplate({ templateId });
    setLocalTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }

  async function scanReceipt(file: File): Promise<void> {
    setOcrPending(true);
    setOcrError(null);
    setOcrNote(null);

    const formData = new FormData();
    formData.append("groupId", groupId);
    formData.append("receipt", file);

    try {
      const response = await fetch("/api/receipts/ocr", {
        method: "POST",
        body: formData,
      });
      const data = readOcrResponse(await response.json());
      if (!response.ok) {
        setOcrError(data.error ?? "Could not read that receipt.");
        return;
      }

      let applied = 0;
      if (data.title) {
        setTitle(data.title);
        applied++;
      }
      if (data.amountRupees) {
        setAmount(data.amountRupees);
        applied++;
      }

      if (applied === 0) {
        setOcrNote("Receipt scanned. No confident amount or merchant was found.");
      } else {
        const parts = [
          data.amountRupees ? "amount" : null,
          data.title ? "title" : null,
        ].filter(Boolean);
        setOcrNote(`Applied ${parts.join(" and ")} from the receipt.`);
      }
    } catch {
      setOcrError("Could not read that receipt. Try another image.");
    } finally {
      setOcrPending(false);
    }
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

      {!initial && (
        <div className="rounded-2xl border border-white/6 bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-hi">Receipt OCR</p>
              <p className="mt-1 text-sm leading-5 text-dim">
                {userTier === "paid"
                  ? "Upload a receipt image to prefill the title and amount."
                  : "Receipt scanning is included with Owely Pro."}
              </p>
            </div>
            {userTier === "paid" ? (
              <label className="flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-accent/25 bg-accent/10 px-4 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
                {ocrPending ? "Scanning..." : "Upload receipt"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={pending || ocrPending}
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = "";
                    if (file) void scanReceipt(file);
                  }}
                />
              </label>
            ) : (
              <Link
                href="/settings"
                className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 px-4 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                View Pro
              </Link>
            )}
          </div>
          {(ocrError || ocrNote) && (
            <p
              role={ocrError ? "alert" : "status"}
              className={`mt-3 text-sm ${ocrError ? "text-coral-soft" : "text-mint"}`}
            >
              {ocrError ?? ocrNote}
            </p>
          )}
        </div>
      )}

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
                    ? "border-[1.5px] border-accent bg-accent/15 font-semibold text-ink"
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

      {/* saved templates — Pro only */}
      {userTier === "paid" && localTemplates.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="px-0.5 text-[13px] text-dim">Templates</span>
          <div className="flex flex-wrap gap-2">
            {localTemplates.map((t) => (
              <div key={t.id} className="group flex items-center gap-0 rounded-full border border-white/8 bg-card">
                <button
                  type="button"
                  onClick={() => applyTemplate(t)}
                  disabled={pending}
                  className="flex items-center gap-1.5 py-1.5 pl-3 pr-2 text-[12.5px] font-medium text-strong transition-colors hover:text-hi focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="text-[10px] text-dim">{t.splitType === "equal" ? "=" : "%"}</span>
                  {t.name}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteTemplate(t.id)}
                  disabled={pending}
                  aria-label={`Delete template ${t.name}`}
                  className="flex h-7 w-6 items-center justify-center rounded-r-full text-faint opacity-0 transition-opacity hover:text-coral group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  ? "bg-accent text-ink"
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

      {/* save as template — Pro, equal/percentage only */}
      {userTier === "paid" && splitType !== "unequal" && (
        <div>
          {!showSaveForm ? (
            <button
              type="button"
              onClick={() => setShowSaveForm(true)}
              className="flex items-center gap-1.5 px-0.5 text-[12.5px] text-dim hover:text-muted"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Save as template
            </button>
          ) : (
            <form onSubmit={(e) => void handleSaveTemplate(e)} className="flex items-center gap-2">
              <input
                type="text"
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                placeholder="Template name"
                maxLength={40}
                autoFocus
                disabled={savingTemplate}
                className="h-9 flex-1 rounded-xl border border-white/8 bg-card px-3 text-[13px] text-hi outline-none placeholder:text-faint focus:border-accent/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
              />
              <button
                type="submit"
                disabled={savingTemplate || !saveTemplateName.trim()}
                className="h-9 rounded-xl bg-accent px-3 text-[12.5px] font-semibold text-ink disabled:opacity-60"
              >
                {savingTemplate ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => { setShowSaveForm(false); setSaveTemplateName(""); }}
                className="h-9 rounded-xl border border-white/8 px-3 text-[12.5px] text-muted hover:bg-elevated"
              >
                Cancel
              </button>
            </form>
          )}
          {templateSavedMsg && <p className="mt-1.5 text-[12px] text-mint">{templateSavedMsg}</p>}
        </div>
      )}

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
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-ink shadow-[0_14px_32px_-10px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
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
