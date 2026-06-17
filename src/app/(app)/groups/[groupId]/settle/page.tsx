import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { fetchGroup, fetchSettlements, fetchUser } from "@/lib/read-model";
import { SettlePanel, type SettleDebt, type SettlementRow } from "@/components/SettlePanel";

export default async function SettlePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await requireSession();
  const group = await fetchGroup(groupId);
  if (!group || !group.members.includes(user.uid)) notFound();

  const profiles = await Promise.all(group.members.map((uid) => fetchUser(uid)));
  const nameOf = (uid: string): string =>
    group.memberDetails[uid]?.name ?? "Someone";
  const upiOf = (uid: string): string | undefined =>
    profiles.find((p) => p?.uid === uid)?.upiId;
  const phoneOf = (uid: string): string | undefined =>
    profiles.find((p) => p?.uid === uid)?.phone ?? undefined;

  const myDebts: SettleDebt[] = group.simplifiedDebts
    .filter((t) => t.from === user.uid)
    .map((t) => ({
      to: t.to,
      toName: nameOf(t.to),
      toUpiId: upiOf(t.to),
      toPhone: phoneOf(t.to),
      amount: t.amount,
      amountRupees: (t.amount / 100).toFixed(2),
    }));

  const settlements = await fetchSettlements(groupId);
  const history: SettlementRow[] = settlements
    .filter((s) => s.status !== "pending")
    .map((s) => ({
      id: s.id,
      from: s.from,
      to: s.to,
      fromName: s.from === user.uid ? "You" : nameOf(s.from),
      toName: s.to === user.uid ? "You" : nameOf(s.to),
      amount: s.amount,
      method: s.method ?? "upi",
      status: s.status,
      paymentRef: s.paymentRef,
      canDispute: s.to === user.uid && s.status === "completed",
    }));

  return (
    <div className="flex flex-col gap-6">
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
            Settle up
          </h1>
        </div>
      </div>
      <SettlePanel
        groupId={groupId}
        myDebts={myDebts}
        history={history}
        groupName={group.name}
      />
    </div>
  );
}
