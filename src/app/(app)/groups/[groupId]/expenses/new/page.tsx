import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/features/auth/session";
import { fetchGroup } from "@/features/groups/queries";
import { fetchUser } from "@/features/auth/queries";
import { fetchGroupTemplates } from "@/features/templates/queries";
import { fetchExpense } from "@/features/expenses/queries";
import { ExpenseForm, ExpenseFormInitial } from "@/components/ExpenseForm";

export default async function NewExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { groupId } = await params;
  const { duplicateId } = await searchParams;
  const user = await requireSession();
  
  const [group, profile] = await Promise.all([
    fetchGroup(groupId),
    fetchUser(user.uid),
  ]);
  
  const isPaid = profile?.tier === "paid";
  const templates = isPaid ? await fetchGroupTemplates(user.uid, groupId) : [];
  if (!group || !group.members.includes(user.uid)) notFound();

  const members = group.members.map((uid) => ({
    uid,
    name: group.memberDetails[uid]?.name ?? "Someone",
  }));

  let initial: ExpenseFormInitial | undefined;
  if (typeof duplicateId === "string") {
    const dup = await fetchExpense(groupId, duplicateId);
    if (dup) {
      initial = {
        expenseId: "", // Empty to ensure it creates a new one
        title: dup.title,
        amountRupees: (dup.amount / 100).toString(),
        paidBy: dup.paidBy,
        category: dup.category,
        splitType: "unequal",
        participants: Object.keys(dup.splits),
        splitValues: Object.fromEntries(
          Object.entries(dup.splits).map(([k, v]) => [
            k,
            (v / 100).toString(),
          ])
        ),
      };
    }
  }

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
            Add expense
          </h1>
        </div>
      </div>
      <ExpenseForm
        groupId={groupId}
        members={members}
        currentUid={user.uid}
        userTier={isPaid ? "paid" : "free"}
        templates={templates}
        initial={initial}
      />
    </div>
  );
}
