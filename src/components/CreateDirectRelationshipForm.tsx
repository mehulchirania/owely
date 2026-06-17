"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDirectRelationship } from "@/actions/groups";

export function CreateDirectRelationshipForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await createDirectRelationship({ name, phone });
      if (!res.ok) {
        setError(res.fieldErrors?.phone?.[0] ?? res.fieldErrors?.name?.[0] ?? res.error);
        return;
      }
      if (res.data.groupId) {
        setName("");
        setPhone("");
        setOpen(false);
        router.push(`/groups/${res.data.groupId}`);
        return;
      }
      setNotice(res.data.existing ? "Invite already pending." : "Invite saved. They'll appear here after signing in.");
      setName("");
      setPhone("");
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setNotice(null);
        }}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 font-semibold text-white shadow-[0_12px_26px_-10px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add person
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-white/6 bg-card p-4">
      <label htmlFor="person-name" className="text-sm font-medium text-strong">
        Person
      </label>
      <input
        id="person-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Rohan, Aditi, flatmate..."
        maxLength={60}
        disabled={pending}
        className="h-12 rounded-xl border border-white/8 bg-surface px-3 text-hi outline-none placeholder:text-faint focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      />
      <label htmlFor="person-phone" className="text-sm font-medium text-strong">
        Phone number
      </label>
      <input
        id="person-phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="9876543210"
        inputMode="tel"
        maxLength={16}
        disabled={pending}
        className="h-12 rounded-xl border border-white/8 bg-surface px-3 text-hi outline-none placeholder:text-faint focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      />
      {error && <p role="alert" className="text-sm text-coral-soft">{error}</p>}
      {notice && <p className="text-sm text-mint-soft">{notice}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || name.trim().length === 0 || phone.trim().length === 0}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-accent px-4 font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? "Adding..." : "Add"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="flex h-11 items-center justify-center rounded-xl border border-white/8 px-4 font-semibold text-strong transition-colors hover:bg-elevated"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
