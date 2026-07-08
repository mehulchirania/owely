"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatPaise } from "@/lib/money";

interface DebtItem {
  id: string;
  name: string;
  amount: number; // amount owed in paise
}

interface Props {
  open: boolean;
  onClose: () => void;
  debts: DebtItem[];
}

export function SettleAllSheet({ open, onClose, debts }: Props) {
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

        <h2 className="font-display text-[22px] font-bold text-hi mb-4">Settle Up</h2>

        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto scrollbar-hide">
          {debts.length === 0 ? (
            <p className="text-[14px] text-dim text-center py-6">You don&apos;t owe anything! 🎉</p>
          ) : (
            debts.map((debt) => (
              <button
                key={debt.id}
                onClick={() => {
                  onClose();
                  router.push(`/groups/${debt.id}?tab=balances`);
                }}
                className="flex items-center justify-between rounded-2xl bg-surface px-5 py-4 text-left transition-colors hover:bg-elevated active:scale-[0.98]"
              >
                <span className="font-semibold text-hi truncate pr-4">{debt.name}</span>
                <span className="font-semibold text-coral whitespace-nowrap">
                  {formatPaise(debt.amount)}
                </span>
              </button>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 flex h-14 items-center justify-center rounded-2xl border border-white/6 font-semibold text-strong transition-colors hover:bg-surface active:scale-[0.98]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
