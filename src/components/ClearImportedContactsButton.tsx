"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearImportedContacts } from "@/features/contacts/actions";
import { useToast } from "@/components/ToastProvider";

export function ClearImportedContactsButton({ count }: { count: number }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function clearContacts(): void {
    setError(null);
    startTransition(async () => {
      const result = await clearImportedContacts();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(false);
      showToast(`${result.data.deleted} contacts cleared`, "success");
      router.refresh();
    });
  }

  if (count === 0) {
    return <p className="text-xs text-dim">No imported contacts stored.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-dim">
        {count} imported {count === 1 ? "contact is" : "contacts are"} stored for matching.
      </p>
      {confirming ? (
        <div className="rounded-xl border border-coral/20 bg-coral/10 p-3">
          <p className="text-sm font-medium text-coral">Clear all imported contacts?</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={clearContacts}
              disabled={pending}
              className="flex h-10 items-center rounded-xl bg-coral px-4 text-xs font-bold text-ink disabled:opacity-60"
            >
              {pending ? "Clearing..." : "Clear"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="flex h-10 items-center rounded-xl border border-white/8 px-4 text-xs font-semibold text-strong hover:bg-elevated disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex h-11 items-center justify-center rounded-xl border border-coral/20 px-4 text-sm font-semibold text-coral hover:bg-coral/10"
        >
          Clear imported contacts
        </button>
      )}
      {error && <p role="alert" className="text-sm text-coral-soft">{error}</p>}
    </div>
  );
}
