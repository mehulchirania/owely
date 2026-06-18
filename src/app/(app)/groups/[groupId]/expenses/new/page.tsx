import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/features/auth/session";
import { fetchGroup } from "@/features/groups/queries";
import { fetchUser } from "@/features/auth/queries";
import { ExpenseForm } from "@/components/ExpenseForm";

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await requireSession();
  const [group, profile] = await Promise.all([
    fetchGroup(groupId),
    fetchUser(user.uid),
  ]);
  if (!group || !group.members.includes(user.uid)) notFound();

  const members = group.members.map((uid) => ({
    uid,
    name: group.memberDetails[uid]?.name ?? "Someone",
  }));

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
        userTier={profile?.tier ?? "free"}
      />
    </div>
  );
}
