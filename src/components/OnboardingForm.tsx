"use client";

/**
 * Onboarding form — collects display name (required) and email (optional)
 * on a user's first sign-in before they enter the app. Calls `updateProfile`
 * which is the same action used in /settings, so no duplication.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/features/auth/actions";
import { ContactImportPanel } from "@/components/ContactImportPanel";

export function OnboardingForm({ next }: { next: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleNameSubmit(e: React.FormEvent) {
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
      setStep(2);
    });
  }

  async function handleUpiSubmit(e: React.FormEvent, skip = false) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      if (!skip && upiId.trim()) {
        const result = await updateProfile({ upiId: upiId.trim() });
        if (!result.ok) {
          setError(result.fieldErrors?.upiId?.[0] ?? result.error);
          return;
        }
      }
      setStep(3);
    });
  }

  if (step === 3) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-mint/15 text-4xl">
          🎉
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-bold text-hi">You&apos;re all set!</h2>
          <p className="text-[14px] text-dim">
            Create your first group or add someone you split with often.
          </p>
        </div>

        <div className="w-full">
          <ContactImportPanel kind="people" />
        </div>
        
        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push("/groups")}
            className="flex h-13 w-full items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-ink shadow-[0_16px_42px_-16px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Create a Group
          </button>
          <button
            type="button"
            onClick={() => { router.replace(next); router.refresh(); }}
            className="flex h-13 w-full items-center justify-center rounded-2xl border border-white/8 bg-transparent px-6 font-semibold text-strong transition-colors hover:bg-card"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2">
        <div className={`h-1.5 w-1.5 rounded-full ${step >= 1 ? "bg-accent" : "bg-white/10"}`} />
        <div className={`h-1.5 w-1.5 rounded-full ${step >= 2 ? "bg-accent" : "bg-white/10"}`} />
      </div>

      <form onSubmit={step === 1 ? handleNameSubmit : (e) => handleUpiSubmit(e, false)} className="flex flex-col gap-5">
        {error && (
          <p role="alert" className="rounded-2xl border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral-soft">
            {error}
          </p>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-2.5">
            <label htmlFor="displayName" className="text-[14px] font-medium text-strong">
              What should we call you?
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
              className="h-14 rounded-2xl border border-white/8 bg-card px-4 text-[15px] font-medium text-hi outline-none placeholder:text-faint focus:border-accent/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-60"
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="upiId" className="text-[14px] font-medium text-strong">
                Your UPI ID
              </label>
              <span className="rounded-full bg-accent/20 px-2 py-[2px] text-[10px] font-bold uppercase tracking-wider text-accent">
                Recommended
              </span>
            </div>
            <input
              id="upiId"
              name="upiId"
              type="text"
              autoFocus
              placeholder="name@okaxis"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              disabled={isPending}
              className="h-14 rounded-2xl border border-white/8 bg-card px-4 text-[15px] font-medium text-hi outline-none placeholder:text-faint focus:border-accent/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-60"
            />
            <p className="text-[13px] leading-snug text-dim">
              Allows friends to settle up with you instantly. You can skip this and add it later in settings.
            </p>
          </div>
        )}

        <div className="mt-2 flex flex-col gap-3">
          <button
            type="submit"
            disabled={isPending || (step === 1 && !name.trim()) || (step === 2 && !upiId.trim())}
            className="flex h-14 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-ink shadow-[0_16px_42px_-16px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
          >
            {isPending ? "Saving…" : step === 1 ? "Continue" : "Save UPI ID"}
          </button>
          
          {step === 2 && (
            <button
              type="button"
              disabled={isPending}
              onClick={(e) => handleUpiSubmit(e, true)}
              className="flex h-14 items-center justify-center rounded-2xl border border-white/8 bg-transparent px-6 font-semibold text-strong transition-colors hover:bg-card disabled:opacity-60"
            >
              Skip for now
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
