import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { fetchOwnExpenses, fetchUser } from "@/lib/read-model";
import { OwnExpenseManager } from "@/components/OwnExpenseManager";

export const metadata: Metadata = { title: "Personal Ledger — Owely" };

export default async function OwnPage() {
  const session = await requireSession();
  const [ownExpenses, user] = await Promise.all([
    fetchOwnExpenses(session.uid),
    fetchUser(session.uid),
  ]);

  const currency = user?.currency ?? "INR";
  const userTier = user?.tier ?? "free";

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
        userTier={userTier}
        currency={currency}
      />
    </div>
  );
}
