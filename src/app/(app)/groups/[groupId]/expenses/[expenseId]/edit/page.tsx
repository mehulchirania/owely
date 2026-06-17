import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { fetchExpense, fetchGroup } from "@/lib/read-model";
import { ExpenseForm, type ExpenseFormInitial } from "@/components/ExpenseForm";

/** Paise to a plain rupee string for prefilling inputs (no symbol, no grouping). */
function paiseToRupeeString(paise: number): string {
  return (paise / 100).toFixed(2);
}

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const { groupId, expenseId } = await params;
  const user = await requireSession();
  const group = await fetchGroup(groupId);
  if (!group || !group.members.includes(user.uid)) notFound();

  const expense = await fetchExpense(groupId, expenseId);
  if (!expense) notFound();

  const members = group.members.map((uid) => ({
    uid,
    name: group.memberDetails[uid]?.name ?? "Someone",
  }));

  const participants = Object.keys(expense.splits);
  const splitValues: Record<string, string> = {};
  for (const [uid, paise] of Object.entries(expense.splits)) {
    splitValues[uid] = paiseToRupeeString(paise);
  }

  const initial: ExpenseFormInitial = {
    expenseId: expense.id,
    title: expense.title,
    amountRupees: paiseToRupeeString(expense.amount),
    paidBy: expense.paidBy,
    category: expense.category,
    splitType: "unequal",
    participants,
    splitValues,
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/groups/${groupId}`}
          aria-label={group.name}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-card text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm text-dim">{group.name}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-hi">
            Edit expense
          </h1>
        </div>
      </div>
      <ExpenseForm
        groupId={groupId}
        members={members}
        currentUid={user.uid}
        userTier="free"
        initial={initial}
      />
    </div>
  );
}
