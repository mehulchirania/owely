"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroup } from "@/actions/groups";

export function CreateGroupForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [groupMode, setGroupMode] = useState("custom");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createGroup({ name, groupMode });
      if (!res.ok) {
        setError(res.fieldErrors?.name?.[0] ?? res.error);
        return;
      }
      setName("");
      setGroupMode("custom");
      setOpen(false);
      router.push(`/groups/${res.data.groupId}`);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 font-semibold text-white shadow-[0_12px_26px_-10px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        New group
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-white/6 bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="group-name" className="text-sm font-medium text-strong">
          Group name
        </label>
        <input
          id="group-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Goa trip, Flat 3B, Lunch crew..."
          maxLength={60}
          disabled={pending}
          className="h-12 rounded-xl border border-white/8 bg-surface px-3 text-hi outline-none placeholder:text-faint focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        />
      </div>
      
      <div className="flex flex-col gap-1.5">
        <label htmlFor="group-mode" className="text-sm font-medium text-strong">
          Group Type
        </label>
        <select
          id="group-mode"
          value={groupMode}
          onChange={(e) => setGroupMode(e.target.value)}
          disabled={pending}
          className="h-12 rounded-xl border border-white/8 bg-surface px-3 text-hi outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent cursor-pointer [&>option]:bg-surface [&>option]:text-hi"
        >
          <option value="custom">Custom / General</option>
          <option value="trip">Trip</option>
          <option value="roommates">Roommates</option>
          <option value="couple">Couple</option>
          <option value="lunch">Office Lunch</option>
          <option value="friends">Friends</option>
          <option value="family">Family</option>
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-coral-soft">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending || name.trim().length === 0}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-accent px-4 font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? "Creating..." : "Create"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          disabled={pending}
          className="flex h-11 items-center justify-center rounded-xl border border-white/8 px-4 font-semibold text-strong transition-colors hover:bg-elevated"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
