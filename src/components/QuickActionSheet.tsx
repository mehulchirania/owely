"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function QuickActionSheet({ open, onClose }: Props) {
  const router = useRouter();

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="relative flex flex-col rounded-t-[28px] border-t border-white/6 bg-card px-6 pb-12 pt-4 shadow-2xl transition-transform duration-300 ease-out"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom))" }}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-white/10" />

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              onClose();
              // When global, we open a picker. For now, since Phase 2.3 handles
              // screen details, we can navigate to /groups and instruct the user
              // to pick a group. Or we can link to a future global Add Expense flow.
              // Let's link to /groups with a query param to open picker, or just /groups.
              router.push("/groups?action=add-expense");
            }}
            className="flex h-14 items-center gap-4 rounded-2xl bg-surface px-5 text-left font-semibold text-hi transition-colors hover:bg-elevated active:scale-[0.98]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
              🧾
            </span>
            Add expense
          </button>

          <button
            onClick={() => {
              onClose();
              // Navigate to Settle Up page. Let's just point to Home or a global settle
              router.push("/home?action=settle");
            }}
            className="flex h-14 items-center gap-4 rounded-2xl bg-surface px-5 text-left font-semibold text-hi transition-colors hover:bg-elevated active:scale-[0.98]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint/15 text-mint">
              💸
            </span>
            Settle up
          </button>

          <button
            onClick={() => {
              onClose();
              router.push("/groups?action=new-group");
            }}
            className="flex h-14 items-center gap-4 rounded-2xl bg-surface px-5 text-left font-semibold text-hi transition-colors hover:bg-elevated active:scale-[0.98]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent2/15 text-accent2">
              ✨
            </span>
            New group
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-6 flex h-14 items-center justify-center rounded-2xl border border-white/6 font-semibold text-strong transition-colors hover:bg-surface active:scale-[0.98]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
