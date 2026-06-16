import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { fetchGroup, fetchExpenses } from "@/lib/read-model";
import { formatPaise } from "@/lib/money";
import { computeNetBalances } from "@/lib/simplify-debts";
import { GroupMenu } from "@/components/GroupMenu";
import { InviteMemberForm } from "@/components/InviteMemberForm";
import { ExpenseFeed } from "@/components/ExpenseFeed";
import { memberAvatar } from "@/lib/avatar";
import type { Group } from "@/types";

function nameOf(group: Group, uid: string): string {
  return group.memberDetails[uid]?.name ?? "Someone";
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await requireSession();
  const group = await fetchGroup(groupId);
  if (!group || !group.members.includes(user.uid)) notFound();

  const expenses = await fetchExpenses(groupId);
  const balances = computeNetBalances(expenses, group.members);
  const myNet = balances[user.uid] ?? 0;
  const transfers = group.simplifiedDebts;
  const myTransfers = transfers.filter((t) => t.from === user.uid || t.to === user.uid);

  return (
    <div className="flex flex-col gap-5">
      {/* group header */}
      <div className="flex items-center gap-3">
        <Link
          href="/groups"
          aria-label="All groups"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-card text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold tracking-tight text-hi">
            {group.name}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex">
              {group.members.slice(0, 4).map((uid, i) => {
                const a = memberAvatar(uid);
                return (
                  <span
                    key={uid}
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-surface font-display text-[9px] ${a.bg} ${a.fg} ${i > 0 ? "-ml-1.5" : ""}`}
                  >
                    {nameOf(group, uid).charAt(0).toUpperCase()}
                  </span>
                );
              })}
            </div>
            <span className="text-xs text-dim">
              {group.members.length} {group.members.length === 1 ? "member" : "members"}
            </span>
          </div>
        </div>
        <GroupMenu groupId={group.id} groupName={group.name} isCreator={group.createdBy === user.uid} />
      </div>

      {/* simplified balances hero */}
      <div className="rounded-3xl border border-white/6 bg-card p-4">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-[13px] text-muted">Simplified balances</span>
          {transfers.length > 0 && (
            <span className="rounded-full bg-accent2/12 px-2.5 py-1 text-[11px] font-semibold text-accent2">
              {transfers.length} {transfers.length === 1 ? "transfer" : "transfers"}
            </span>
          )}
        </div>

        {transfers.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted">
            {myNet === 0 ? "You're all settled up. 🎉" : "Everyone's square. 🎉"}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {(myTransfers.length > 0 ? myTransfers : transfers).map((t) => {
              const iOwe = t.from === user.uid;
              const other = iOwe ? t.to : t.from;
              const a = memberAvatar(other);
              return (
                <div key={t.id} className="flex items-center gap-2.5">
                  <span className={`flex h-[34px] w-[34px] items-center justify-center rounded-full font-display text-sm font-semibold ${a.bg} ${a.fg}`}>
                    {nameOf(group, other).charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm text-strong">
                    {iOwe ? (
                      <>You owe <b className="font-semibold text-hi">{nameOf(group, other)}</b></>
                    ) : (
                      <><b className="font-semibold text-hi">{nameOf(group, other)}</b> owes you</>
                    )}
                  </span>
                  <span className={`font-display text-[15px] font-semibold ${iOwe ? "text-coral" : "text-mint"}`}>
                    {formatPaise(t.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* primary actions */}
      <div className="flex gap-2.5">
        <Link
          href={`/groups/${group.id}/expenses/new`}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/8 bg-elevated font-semibold text-hi transition-colors hover:bg-segment focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add expense
        </Link>
        <Link
          href={`/groups/${group.id}/settle`}
          className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-accent font-semibold text-white shadow-[0_12px_26px_-10px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Settle up
        </Link>
      </div>

      {/* members */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">
            Members ({group.members.length})
          </h2>
          <InviteMemberForm groupId={group.id} />
        </div>
        <ul className="flex flex-wrap gap-2">
          {group.members.map((uid) => {
            const net = balances[uid] ?? 0;
            const a = memberAvatar(uid);
            return (
              <li key={uid} className="flex items-center gap-2 rounded-full border border-white/6 bg-card py-1 pr-3 pl-1">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-semibold ${a.bg} ${a.fg}`}>
                  {nameOf(group, uid).charAt(0).toUpperCase()}
                </span>
                <span className="text-sm text-strong">
                  {uid === user.uid ? "You" : nameOf(group, uid)}
                  {net !== 0 && (
                    <span className={net > 0 ? "text-mint" : "text-coral"}>
                      {" "}{net > 0 ? "+" : "−"}{formatPaise(Math.abs(net))}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* expenses */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">Expenses</h2>
        <ExpenseFeed
          groupId={group.id}
          currentUid={user.uid}
          memberNames={Object.fromEntries(group.members.map((m) => [m, nameOf(group, m)]))}
          initialExpenses={expenses}
        />
      </section>
    </div>
  );
}
