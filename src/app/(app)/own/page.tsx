import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { fetchOwnExpenses } from "@/features/personal-ledger/queries";

import { OwnExpenseManager } from "@/components/OwnExpenseManager";

export const metadata: Metadata = { title: "Personal Ledger — Owely" };

export default async function OwnPage() {
  const session = await requireSession();

  const ownExpenses = await fetchOwnExpenses(session.uid);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-dim">Personal Ledger</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-hi">
          My Expenses
        </h1>
        <p className="text-xs text-muted mt-1">
          Private, un-shared expenses not visible to anyone else.
        </p>
      </div>

      <OwnExpenseManager
        initialExpenses={ownExpenses}
      />
    </div>
  );
}
