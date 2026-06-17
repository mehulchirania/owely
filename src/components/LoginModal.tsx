"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "./LoginForm";

export function LoginModal() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // Open the native dialog on mount
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function handleClose() {
    // Navigate away from the ?login=true URL
    router.push("/");
    router.refresh();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      handleClose();
    }
  }

  return (
    <>
      {/* Invisible reCAPTCHA must live outside the dialog to avoid stacking
          context isolation breaking the widget resolution. */}
      <div id="recaptcha-container" />

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        onClick={handleBackdropClick}
        className="backdrop:bg-ink/80 backdrop:backdrop-blur-sm bg-transparent m-auto p-0 open:flex items-center justify-center"
      >
      <div className="relative w-full max-w-[390px] rounded-[26px] border border-white/8 bg-surface p-5 shadow-[0_30px_90px_-42px_rgba(0,0,0,.9)] sm:p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-card text-dim hover:bg-white/5 hover:text-hi transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Close dialog"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M1 13L13 1" />
          </svg>
        </button>
        
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-2xl">
                {"\u{1F989}"}
              </span>
              <span className="font-display text-2xl font-bold tracking-tight text-hi">owely</span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-hi">
              Sign in
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              New? Just sign in — we’ll set up your account automatically.
            </p>
          </div>
        </div>

        <Suspense fallback={<div className="h-48 w-full animate-pulse rounded-2xl bg-card" />}>
          <LoginForm />
        </Suspense>

        <p className="mt-5 text-center text-xs text-faint">
          No account yet?{" "}
          <span className="text-dim">
            Sign in with your phone number — we’ll walk you through setup.
          </span>
        </p>
      </div>
    </dialog>
    </>
  );
}
