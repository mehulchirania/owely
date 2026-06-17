"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteByPhone } from "@/features/groups/actions";

export function InviteMemberForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await inviteByPhone({ groupId, phone, name });
      if (!res.ok) {
        setError(res.fieldErrors?.phone?.[0] ?? res.fieldErrors?.name?.[0] ?? res.error);
        return;
      }
      setNotice(
        res.data.linked
          ? `${name} was added to the group.`
          : `Invite sent. ${name} joins when they sign in with this number.`,
      );
      setPhone("");
      setName("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-card px-3 text-sm font-semibold text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        Invite
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3 rounded-2xl border border-white/6 bg-card p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-name" className="text-sm font-medium text-strong">Name</label>
        <input
          id="invite-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Priya"
          maxLength={60}
          disabled={pending}
          className="h-12 rounded-xl border border-white/8 bg-surface px-3 text-hi outline-none placeholder:text-faint focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-phone" className="text-sm font-medium text-strong">Mobile number</label>
        <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-surface px-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
          <span className="text-dim">+91</span>
          <input
            id="invite-phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98765 43210"
            disabled={pending}
            className="h-12 flex-1 bg-transparent text-hi outline-none placeholder:text-faint"
          />
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-coral-soft">{error}</p>}
      {notice && <p className="text-sm text-mint">{notice}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || name.trim() === "" || phone.trim() === ""}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-accent px-4 font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {pending ? "Inviting..." : "Send invite"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); setNotice(null); }}
          disabled={pending}
          className="flex h-11 items-center justify-center rounded-xl border border-white/8 px-4 font-semibold text-strong transition-colors hover:bg-elevated"
        >
          Close
        </button>
      </div>
    </form>
  );
}
