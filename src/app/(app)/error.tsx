"use client";

/**
 * Error boundary for the authenticated app. A server-side read can fail when
 * Firebase is not configured yet, so keep the recovery path visible.
 */

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isFirestoreDisabled = /Cloud Firestore API has not been used|PERMISSION_DENIED/i.test(
    error.message,
  );

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/6 bg-card px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral/15 text-2xl text-coral" aria-hidden>
        !
      </span>
      <p className="font-medium text-hi">Something went wrong loading this page.</p>
      {isFirestoreDisabled ? (
        <p className="max-w-sm text-sm leading-6 text-dim">
          The Firestore database is not set up for this project yet. Create it in the Firebase console, then retry.
        </p>
      ) : (
        <p className="max-w-sm text-sm leading-6 text-dim">
          This is usually temporary. Check your connection and try again.
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="flex h-11 items-center justify-center rounded-xl bg-accent px-6 font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Try again
      </button>
    </div>
  );
}
