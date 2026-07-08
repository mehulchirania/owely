"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMembersByPhone } from "@/features/groups/actions";

interface Row {
  name: string;
  phone: string;
}

const EMPTY_ROW: Row = { name: "", phone: "" };

export function BatchInviteForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }, { ...EMPTY_ROW }]);
  const [result, setResult] = useState<{ added: number; invited: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setRow(i: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const people = rows
      .map((r) => ({ name: r.name.trim(), phone: r.phone.trim() }))
      .filter((r) => r.name && r.phone);
    if (people.length === 0) {
      setError("Add at least one name and phone number.");
      return;
    }
    startTransition(async () => {
      const res = await addMembersByPhone({ groupId, people });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
      setRows([{ ...EMPTY_ROW }, { ...EMPTY_ROW }]);
      router.refresh();
    });
  }

  function reset() {
    setOpen(false);
    setRows([{ ...EMPTY_ROW }, { ...EMPTY_ROW }]);
    setResult(null);
    setError(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/8 bg-card px-3 text-[12.5px] font-medium text-muted transition-colors hover:bg-elevated hover:text-strong"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        Add multiple
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/6 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-hi">Add multiple people</p>
        <button type="button" onClick={reset} className="text-[12px] text-dim hover:text-muted">Cancel</button>
      </div>

      {result ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-4 rounded-xl border border-white/6 bg-surface px-4 py-3 text-sm">
            <span className="text-mint font-semibold">{result.added} added</span>
            <span className="text-accent font-semibold">{result.invited} invited</span>
            {result.skipped > 0 && <span className="text-dim">{result.skipped} skipped</span>}
          </div>
          <button type="button" onClick={reset} className="min-h-[44px] rounded-xl border border-white/8 text-sm font-medium text-strong hover:bg-elevated px-4">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_1fr_28px] gap-1.5 px-0.5">
              <span className="text-[11px] text-dim">Name</span>
              <span className="text-[11px] text-dim">Mobile (+91)</span>
              <span />
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_28px] gap-1.5 items-center">
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => setRow(i, "name", e.target.value)}
                  placeholder="Priya"
                  maxLength={60}
                  disabled={pending}
                  aria-label={`Name for row ${i + 1}`}
                  className="h-10 rounded-xl border border-white/8 bg-surface px-3 text-[13px] text-hi outline-none placeholder:text-faint focus:border-accent/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={row.phone}
                  onChange={(e) => setRow(i, "phone", e.target.value)}
                  placeholder="98765 43210"
                  disabled={pending}
                  aria-label={`Phone for row ${i + 1}`}
                  className="h-10 rounded-xl border border-white/8 bg-surface px-3 text-[13px] text-hi outline-none placeholder:text-faint focus:border-accent/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length <= 1 || pending}
                  aria-label="Remove row"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-faint transition-colors hover:bg-elevated hover:text-coral disabled:opacity-30"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            disabled={pending}
            className="flex h-8 items-center gap-1.5 self-start rounded-lg border border-white/6 px-3 text-[12px] text-dim hover:bg-elevated hover:text-muted"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add row
          </button>

          {error && <p role="alert" className="text-sm text-coral-soft">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="flex h-11 items-center justify-center rounded-xl bg-accent font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add all"}
          </button>
        </form>
      )}
    </div>
  );
}
