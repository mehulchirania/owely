"use client";

/**
 * Sign-in: Google popup + Phone OTP. On success it mints a session cookie
 * (`POST /api/auth/session`), upserts the user (`ensureUser`), then routes into
 * the app. The Firebase client session is transient — the server session
 * cookie is the source of truth from here on.
 */

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  type ConfirmationResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, googleAuthProvider } from "@/lib/firebase/client";
import { authErrorMessage } from "@/features/auth/auth-errors";
import { ensureUser } from "@/features/auth/actions";

/** Best-effort client-side E.164 for India. The server re-validates strictly. */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return raw.trim().startsWith("+") ? raw.trim() : `+${digits}`;
}

type PhoneStep = "phone" | "code";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/groups";

  const [pending, setPending] = useState<"google" | "phone" | null>(null);
  const [status, setStatus] = useState<string>("Verifying…");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<PhoneStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  async function finishSignIn(user: FirebaseUser): Promise<void> {
    setStatus("Starting session…");
    const idToken = await user.getIdToken();
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Could not start your session. Please try again.");

    setStatus("Setting up your account…");
    const ensured = await ensureUser();
    if (!ensured.ok) throw new Error(ensured.error);

    // First-time sign-in: display name is still the phone number or the default
    // placeholder — send the user through onboarding to pick a real name.
    setStatus("Redirecting…");
    const u = ensured.data;
    const needsOnboarding =
      !u.displayName ||
      u.displayName === "Owely user" ||
      u.displayName === u.phone;
    if (needsOnboarding) {
      const dest = next !== "/groups" ? `?next=${encodeURIComponent(next)}` : "";
      router.replace(`/onboarding${dest}`);
    } else {
      router.replace(next);
    }
    // No router.refresh() here — we're navigating away; refreshing the current
    // page's data before unmounting is redundant and adds latency.
  }

  async function handleGoogle(): Promise<void> {
    setError(null);
    setPending("google");
    try {
      const cred = await signInWithPopup(getFirebaseAuth(), googleAuthProvider);
      await finishSignIn(cred.user);
    } catch (e) {
      setError(e instanceof Error && !("code" in e) ? e.message : authErrorMessage(e));
      setPending(null);
    }
  }

  function getRecaptcha(): RecaptchaVerifier {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(
        getFirebaseAuth(),
        "recaptcha-container",
        { size: "invisible" },
      );
    }
    return recaptchaRef.current;
  }

  async function handleSendOtp(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setPending("phone");
    setStep("code");
    try {
      confirmationRef.current = await signInWithPhoneNumber(
        getFirebaseAuth(),
        toE164(phone),
        getRecaptcha(),
      );
    } catch (e) {
      setError(authErrorMessage(e));
      setStep("phone");
    } finally {
      setPending(null);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (!confirmationRef.current) {
      setError("Request a new code.");
      setStep("phone");
      return;
    }
    setStatus("Verifying…");
    setPending("phone");
    try {
      const cred = await confirmationRef.current.confirm(code.trim());
      await finishSignIn(cred.user);
    } catch (e) {
      setError(e instanceof Error && !("code" in e) ? e.message : authErrorMessage(e));
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <div className="flex w-full flex-col gap-3">
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral-soft"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="flex h-13 items-center justify-center gap-2.5 rounded-2xl bg-hi px-6 font-semibold text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
      >
        <GoogleGlyph />
        {pending === "google" ? "Signing in…" : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3 py-1 text-xs text-faint">
        <span className="h-px flex-1 bg-white/8" />
        or use your phone
        <span className="h-px flex-1 bg-white/8" />
      </div>

      {step === "phone" ? (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
          <label htmlFor="phone" className="text-sm font-medium text-strong">
            Mobile number
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-card px-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)] focus-within:border-accent/60 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
            <span className="text-dim">+91</span>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
              className="h-13 flex-1 bg-transparent text-hi outline-none placeholder:text-faint"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex h-13 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-ink shadow-[0_16px_42px_-16px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
          >
            {pending === "phone" ? "Sending…" : "Continue with phone number"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
          <label htmlFor="code" className="text-sm font-medium text-strong">
            Enter the 6-digit code sent to {toE164(phone)}
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="------"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            disabled={busy}
            className="h-13 rounded-2xl border border-white/8 bg-card px-3 text-center font-display text-lg tracking-[0.5em] text-hi outline-none placeholder:text-faint focus:border-accent/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-accent"
          />
          <button
            type="submit"
            disabled={busy || code.length < 6}
            className="flex h-13 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-ink shadow-[0_16px_42px_-16px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:translate-y-0 disabled:opacity-60"
          >
            {pending === "phone" ? status : "Verify & continue"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
            disabled={busy}
            className="text-sm text-dim underline-offset-2 hover:underline"
          >
            Use a different number
          </button>
        </form>
      )}

      {/* Invisible reCAPTCHA mount point for Phone OTP. */}
      <div id="recaptcha-container" />
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 .96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
