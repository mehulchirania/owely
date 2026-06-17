import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { fetchGroup, fetchExpenses, fetchSettlements, fetchUser } from "@/lib/read-model";
import { formatPaise } from "@/lib/money";
import { memberAvatar } from "@/lib/avatar";
import { GuestSettlePanel, type GuestSettleDebt, type GuestSettlementRow } from "@/components/GuestSettlePanel";
import { ExpenseFeed } from "@/components/ExpenseFeed";

export default async function GuestGroupPage(props: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await props.params;

  // Read guest session cookie
  const cookieStore = await cookies();
  const guestUid = cookieStore.get(`guest_session_${groupId}`)?.value;
  const guestName = cookieStore.get(`guest_name_${groupId}`)?.value || "Guest";

  if (!guestUid) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-4xl text-rose-500">
          🔒
        </span>
        <h1 className="font-display text-2xl font-bold text-hi">Access Denied</h1>
        <p className="text-sm text-dim max-w-sm">
          Please use the invite link shared with you by a group member to access this group.
        </p>
      </div>
    );
  }

  const group = await fetchGroup(groupId);
  if (!group || !group.members.includes(guestUid)) {
    return notFound();
  }

  // Fetch data
  const [expenses, settlements, profiles] = await Promise.all([
    fetchExpenses(groupId),
    fetchSettlements(groupId),
    Promise.all(group.members.map((uid) => fetchUser(uid))),
  ]);

  const nameOf = (uid: string): string => {
    if (uid === guestUid) return `${guestName} (You)`;
    return group.memberDetails[uid]?.name ?? "Someone";
  };

  const phoneOf = (uid: string): string | undefined =>
    profiles.find((p) => p?.uid === uid)?.phone ?? undefined;

  const upiOf = (uid: string): string | undefined =>
    profiles.find((p) => p?.uid === uid)?.upiId;

  // Filter transfers where guest owes money
  const transfers = group.simplifiedDebts;
  const myDebts: GuestSettleDebt[] = transfers
    .filter((t) => t.from === guestUid)
    .map((t) => ({
      to: t.to,
      toName: nameOf(t.to),
      toUpiId: upiOf(t.to),
      toPhone: phoneOf(t.to),
      amount: t.amount,
      amountRupees: (t.amount / 100).toFixed(2),
    }));

  const history: GuestSettlementRow[] = settlements
    .filter((s) => s.status !== "pending")
    .map((s) => ({
      id: s.id,
      from: s.from,
      to: s.to,
      fromName: nameOf(s.from),
      toName: nameOf(s.to),
      amount: s.amount,
      method: s.method ?? "upi",
      status: s.status,
      paymentRef: s.paymentRef,
    }));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            Guest Ledger Link
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-hi truncate">
          {group.name}
        </h1>
        <p className="text-sm text-dim">
          Logged in as guest: <b className="text-strong">{guestName}</b>
        </p>
      </div>

      {/* Settle Panel */}
      <GuestSettlePanel
        groupId={groupId}
        groupName={group.name}
        guestUid={guestUid}
        myDebts={myDebts}
        history={history}
      />

      {/* Expense feed (Read-only) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">
          Expenses (Read-Only)
        </h2>
        <ExpenseFeed
          groupId={groupId}
          currentUid={guestUid}
          memberNames={Object.fromEntries(group.members.map((uid) => [uid, nameOf(uid)]))}
          initialExpenses={expenses}
        />
      </section>
    </div>
  );
}
