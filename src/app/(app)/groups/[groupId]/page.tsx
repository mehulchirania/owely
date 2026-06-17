import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { headers } from "next/headers";
import { fetchExpenses } from "@/features/expenses/queries";
import { fetchGroup } from "@/features/groups/queries";
import { fetchGroupRecurring } from "@/features/recurring/queries";
import { fetchRelationshipCategories } from "@/features/groups/category-queries";
import { fetchSettlements } from "@/features/settlements/queries";
import { fetchUser } from "@/features/auth/queries";
import { formatPaise } from "@/lib/money";
import { netPositionFromSettlements } from "@/lib/simplify-debts";
import { GroupMenu } from "@/components/GroupMenu";
import { InviteMemberForm } from "@/components/InviteMemberForm";
import { ExpenseFeed } from "@/components/ExpenseFeed";
import { memberAvatar } from "@/lib/avatar";
import { DashboardTabs } from "@/components/DashboardTabs";
import { SettlePanel, type SettleDebt, type SettlementRow } from "@/components/SettlePanel";
import { RecurringPanel } from "@/components/RecurringPanel";
import { CategoryPicker } from "@/components/CategoryPicker";
import type { Group } from "@/types";
import { fetchClosures } from "@/features/groups/closures";
import { MonthlyClosePanel } from "@/components/MonthlyClosePanel";
import { getAdminDb } from "@/lib/firebase/admin";
import { Collections } from "@/lib/firebase/collections";
import { CopyButton } from "@/components/CopyButton";
import { FairnessInsights } from "@/components/FairnessInsights";

function nameOf(group: Group, uid: string): string {
  return group.memberDetails[uid]?.name ?? "Someone";
}

const GROUP_TABS = [
  { id: "expenses", label: "Expenses" },
  { id: "balances", label: "Balances & Settle" },
  { id: "closures", label: "Closures" },
  { id: "members", label: "Members" },
  { id: "recurring", label: "Recurring" },
] as const;

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { groupId } = await params;
  const qParams = await searchParams;
  const activeTab = typeof qParams.tab === "string" ? qParams.tab : "expenses";

  const user = await requireSession();
  const host = (await headers()).get("host") || "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${proto}://${host}`;

  const group = await fetchGroup(groupId);
  if (!group || !group.members.includes(user.uid)) notFound();

  // Parallel fetches for efficiency
  const [expenses, settlements, recurring, profiles, customCategories, closures, pendingInvitesSnap] = await Promise.all([
    fetchExpenses(groupId),
    fetchSettlements(groupId),
    fetchGroupRecurring(groupId),
    Promise.all(group.members.map((uid) => fetchUser(uid))),
    fetchRelationshipCategories(user.uid),
    fetchClosures(groupId),
    getAdminDb()
      .collection(Collections.invites)
      .where("groupId", "==", groupId)
      .where("status", "==", "pending")
      .get(),
  ]);

  const pendingInvites = pendingInvitesSnap.docs.map((doc) => ({
    id: doc.id,
    guestUid: doc.get("guestUid") as string | undefined,
    phone: doc.get("phone") as string,
  }));

  const transfers = group.simplifiedDebts;
  const myNet = netPositionFromSettlements(transfers, user.uid);
  const isDirect = group.type === "direct";
  const currentProfile = profiles.find((p) => p?.uid === user.uid);
  const isPaid = currentProfile?.tier === "paid";

  const peerUid = isDirect
    ? group.directPeerUids?.[user.uid] ?? group.members.find((m) => m !== user.uid)
    : undefined;
  const title = peerUid ? nameOf(group, peerUid) : group.name;
  const backHref = isDirect ? "/groups?tab=people" : "/groups";
  const backLabel = isDirect ? "All people" : "All groups";

  const phoneOf = (uid: string): string | undefined =>
    profiles.find((p) => p?.uid === uid)?.phone ?? undefined;
  const upiOf = (uid: string): string | undefined =>
    profiles.find((p) => p?.uid === uid)?.upiId;

  const myDebts: SettleDebt[] = transfers
    .filter((t) => t.from === user.uid)
    .map((t) => ({
      to: t.to,
      toName: nameOf(group, t.to),
      toUpiId: upiOf(t.to),
      toPhone: phoneOf(t.to),
      amount: t.amount,
      amountRupees: (t.amount / 100).toFixed(2),
    }));

  const history: SettlementRow[] = settlements
    .filter((s) => s.status !== "pending")
    .map((s) => ({
      id: s.id,
      from: s.from,
      to: s.to,
      fromName: s.from === user.uid ? "You" : nameOf(group, s.from),
      toName: s.to === user.uid ? "You" : nameOf(group, s.to),
      amount: s.amount,
      method: s.method ?? "upi",
      status: s.status,
      paymentRef: s.paymentRef,
      canDispute: s.to === user.uid && s.status === "completed",
    }));

  return (
    <div className="flex flex-col gap-6">
      {/* group header */}
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-card text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold tracking-tight text-hi">
            {title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {!isDirect && (
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
            )}
            <span className="text-xs text-dim">
              {isDirect ? "1:1 ledger" : `${group.members.length} ${group.members.length === 1 ? "member" : "members"}`}
            </span>
            <span className="text-xs text-faint">•</span>
            <CategoryPicker
              groupId={group.id}
              currentCategoryId={group.categoryId}
              scope={isDirect ? "direct" : "group"}
              customCategories={customCategories}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isPaid ? (
            <a
              href={`/api/groups/${group.id}/export/pdf`}
              target="_blank"
              rel="noreferrer"
              className="hidden h-10 items-center gap-2 rounded-xl border border-white/8 bg-card px-3 text-sm font-semibold text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M9 15h6" />
                <path d="M9 18h4" />
              </svg>
              Export
            </a>
          ) : (
            <Link
              href="/settings"
              className="hidden h-10 items-center rounded-xl border border-accent/20 bg-accent/10 px-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex"
            >
              Pro export
            </Link>
          )}
          {!isDirect && (
            <GroupMenu groupId={group.id} groupName={group.name} isCreator={group.createdBy === user.uid} />
          )}
        </div>
      </div>

      {/* Inline Tabs switcher */}
      <DashboardTabs tabs={GROUP_TABS} activeTab={activeTab} />

      {/* Tab Content */}
      <div className="mt-2">
        {activeTab === "expenses" && (
          <div className="flex flex-col gap-5">
            <div className="flex justify-end">
              {isPaid ? (
                <a
                  href={`/api/groups/${group.id}/export/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="mr-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-card text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:hidden"
                  aria-label="Export group PDF"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M9 15h6" />
                    <path d="M9 18h4" />
                  </svg>
                </a>
              ) : (
                <Link
                  href="/settings"
                  className="mr-2 flex h-12 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 px-4 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:hidden"
                >
                  Pro
                </Link>
              )}
              <Link
                href={`/groups/${group.id}/expenses/batch`}
                className="mr-2 flex h-12 w-full sm:w-auto sm:px-4 items-center justify-center gap-2 rounded-2xl border border-white/8 bg-card font-semibold text-strong transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Batch add
              </Link>
              <Link
                href={`/groups/${group.id}/expenses/new`}
                className="flex h-12 w-full sm:w-auto sm:px-6 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-white shadow-[0_12px_26px_-10px_var(--color-accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add expense
              </Link>
            </div>

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
        )}

        {activeTab === "balances" && (
          <div className="flex flex-col gap-6">
            {/* simplified balances summary */}
            <div className="rounded-3xl border border-white/6 bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[13px] text-muted font-medium">Simplified transfers summary</span>
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
                <div className="flex flex-col gap-3.5">
                  {transfers.map((t) => {
                    const iOwe = t.from === user.uid;
                    const isToMe = t.to === user.uid;
                    const other = iOwe ? t.to : t.from;
                    const a = memberAvatar(other);
                    return (
                      <div key={t.id} className="flex items-center gap-3">
                        <span className={`flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${a.bg} ${a.fg}`}>
                          {nameOf(group, other).charAt(0).toUpperCase()}
                        </span>
                        <span className="flex-1 text-sm text-strong">
                          {iOwe ? (
                            <>You owe <b className="font-semibold text-hi">{nameOf(group, t.to)}</b></>
                          ) : isToMe ? (
                            <><b className="font-semibold text-hi">{nameOf(group, t.from)}</b> owes you</>
                          ) : (
                            <><b className="font-semibold text-strong">{nameOf(group, t.from)}</b> owes <b className="font-semibold text-strong">{nameOf(group, t.to)}</b></>
                          )}
                        </span>
                        <span className={`font-display text-[15px] font-semibold ${iOwe ? "text-coral" : isToMe ? "text-mint" : "text-strong"}`}>
                          {formatPaise(t.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fairness Insights */}
            <FairnessInsights
              members={group.members.map((uid) => ({
                uid,
                name: uid === user.uid ? "You" : nameOf(group, uid),
              }))}
              expenses={expenses}
              simplifiedDebts={transfers}
            />

            {/* Settle Panel */}
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">Settle Dues</h2>
              <SettlePanel
                groupId={groupId}
                groupName={group.name}
                myDebts={myDebts}
                history={history}
              />
            </div>
          </div>
        )}

        {activeTab === "closures" && (
          <MonthlyClosePanel
            groupId={groupId}
            members={group.members.map((uid) => ({
              uid,
              name: uid === user.uid ? "You" : nameOf(group, uid),
            }))}
            initialClosures={closures}
          />
        )}

        {activeTab === "members" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-hi">Members</h2>
                <p className="text-sm text-dim">People in this group.</p>
              </div>
              {!isDirect && <InviteMemberForm groupId={group.id} />}
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.members.map((uid) => {
                const net = netPositionFromSettlements(transfers, uid);
                const a = memberAvatar(uid);
                const isMe = uid === user.uid;
                const phone = phoneOf(uid);
                const isGuest = uid.startsWith("guest_");
                const invite = isGuest ? pendingInvites.find((inv) => inv.guestUid === uid) : undefined;
                return (
                  <li key={uid} className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-card p-4">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-base font-semibold ${a.bg} ${a.fg}`}>
                      {nameOf(group, uid).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block font-semibold text-hi truncate">
                        {isMe ? "You (Me)" : nameOf(group, uid)}
                        {isGuest && (
                          <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                            Guest
                          </span>
                        )}
                      </span>
                      {isGuest && invite ? (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-dim truncate">{phone || "No phone"}</span>
                          <CopyButton
                            text={`${baseUrl}/api/groups/${groupId}/guest-login?token=${invite.id}`}
                            label="Copy guest link"
                            copiedLabel="Copied!"
                            className="h-6 px-2 rounded-lg border border-white/8 bg-surface text-[10px] font-semibold text-strong transition-colors hover:bg-elevated"
                          />
                        </div>
                      ) : (
                        phone && <span className="block text-xs text-dim truncate">{phone}</span>
                      )}
                    </div>
                    {net !== 0 && (
                      <span className={`font-display font-semibold text-sm ${net > 0 ? "text-mint" : "text-coral"}`}>
                        {net > 0 ? "+" : "−"}{formatPaise(Math.abs(net))}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {activeTab === "recurring" && (
          <RecurringPanel
            groupId={group.id}
            members={group.members.map((uid) => ({
              uid,
              name: uid === user.uid ? "You" : nameOf(group, uid),
            }))}
            currentUid={user.uid}
            userTier={isPaid ? "paid" : "free"}
            recurring={recurring}
          />
        )}
      </div>
    </div>
  );
}
