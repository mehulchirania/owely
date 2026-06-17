"use client";

/**
 * Onboarding form — collects display name (required) and email (optional)
 * on a user's first sign-in before they enter the app. Calls `updateProfile`
 * which is the same action used in /settings, so no duplication.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/actions/auth";

export function OnboardingForm({ next }: { next: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateProfile({ displayName: name.trim() });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-2xl border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral-soft">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="displayName" className="text-sm font-medium text-strong">
          Your name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          autoFocus
          placeholder="e.g. Rohan Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          className="h-13 rounded-2xl border border-white/8 bg-card px-4 text-hi outline-none placeholder:text-faint focus:border-accent/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-60"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="flex h-13 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-white shadow-[0_16px_42px_-16px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Get started →"}
      </button>
    </form>
  );
}
