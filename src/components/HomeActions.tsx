"use client";

import { useState } from "react";
import Link from "next/link";
import { SettleAllSheet } from "./SettleAllSheet";

interface DebtItem {
  id: string;
  name: string;
  amount: number;
}

interface Props {
  owe: number;
  debts: DebtItem[];
}

export function HomeActions({ owe, debts }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="mt-5 flex gap-3">
      {owe > 0 ? (
        <>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-accent text-[14px] font-bold text-white shadow-[0_6px_20px_-6px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Settle up
          </button>
          <SettleAllSheet open={sheetOpen} onClose={() => setSheetOpen(false)} debts={debts} />
        </>
      ) : (
        <Link
          href="/groups"
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-accent text-[14px] font-bold text-white shadow-[0_6px_20px_-6px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Add expense
        </Link>
      )}
    </div>
  );
}
