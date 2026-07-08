"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/features/auth/actions";

interface Props {
  displayName: string;
  upiId: string;
}

export function ProfileForm({ displayName, upiId }: Props) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [upi, setUpi] = useState(upiId);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateProfile({ displayName: name, upiId: upi });
      if (!res.ok) {
        setError(res.fieldErrors?.upiId?.[0] ?? res.fieldErrors?.displayName?.[0] ?? res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-strong">Display name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          disabled={pending}
          className="h-12 rounded-xl border border-white/8 bg-card px-3 text-hi outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        />
      </div>
      <div className="flex flex-col gap-2 rounded-[16px] border border-accent/20 bg-accent/5 p-4">
        <div className="flex items-center justify-between">
          <label htmlFor="upi" className="text-[13.5px] font-semibold text-accent">UPI ID</label>
          <span className="rounded-full bg-accent/20 px-2 py-[2px] text-[10px] font-bold uppercase tracking-wider text-accent">
            Recommended
          </span>
        </div>
        <input
          id="upi"
          value={upi}
          onChange={(e) => setUpi(e.target.value)}
          placeholder="name@okaxis"
          autoCapitalize="none"
          autoCorrect="off"
          disabled={pending}
          className="h-[46px] rounded-xl border border-accent/20 bg-card px-3 text-[15px] font-medium text-hi outline-none placeholder:text-faint focus:border-accent/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        />
        <p className="text-[12px] leading-snug text-accent/80">
          Allows friends to settle up with you instantly via any UPI app.
        </p>
      </div>
      {error && <p role="alert" className="text-sm text-coral-soft">{error}</p>}
      {saved && <p className="text-sm text-mint">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-ink shadow-[0_12px_26px_-10px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
