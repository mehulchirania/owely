import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/features/auth/session";
import { fetchStandardGroups, fetchDirectGroups, fetchUserActivity } from "@/features/groups/queries";
import { fetchRelationshipCategories } from "@/features/groups/category-queries";
import { formatPaise } from "@/lib/money";
import { netPositionFromSettlements } from "@/lib/simplify-debts";
import { CreateGroupForm } from "@/components/CreateGroupForm";
import { CreateDirectRelationshipForm } from "@/components/CreateDirectRelationshipForm";
import { DashboardTabs } from "@/components/DashboardTabs";

import { FilteredGroupsList } from "@/components/FilteredGroupsList";
import { FilteredPeopleList } from "@/components/FilteredPeopleList";

export const metadata: Metadata = { title: "Dashboard — Owely" };



function relativeTime(ms: number): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

const DASHBOARD_TABS = [
  { id: "groups", label: "Groups" },
  { id: "people", label: "People" },
  { id: "activity", label: "Activity" },
] as const;

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireSession();
  const params = await searchParams;
  const activeTab = typeof params.tab === "string" ? params.tab : "groups";

  const [standardGroups, directGroups, activity, customCategories] = await Promise.all([
    fetchStandardGroups(user.uid),
    fetchDirectGroups(user.uid),
    fetchUserActivity(user.uid, 15),
    fetchRelationshipCategories(user.uid),
  ]);

  const allGroups = [...standardGroups, ...directGroups];
  const nets = allGroups.map((g) => netPositionFromSettlements(g.simplifiedDebts, user.uid));
  const overall = nets.reduce((a, b) => a + b, 0);
  const owed = nets.reduce((a, b) => (b > 0 ? a + b : a), 0);
  const owe = nets.reduce((a, b) => (b < 0 ? a - b : a), 0);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col gap-5">
      {/* page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-hi">
            Groups
          </h1>
          <p className="mt-0.5 text-[12.5px] text-dim">
            {standardGroups.length} active {standardGroups.length === 1 ? "group" : "groups"}
          </p>
        </div>
      </div>

      {/* compact balance strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-[13px] border border-mint/14 bg-surface px-4 py-3">
          <p className="mb-0.5 text-[10.5px] text-muted">Total owed to you</p>
          <p className="font-display text-[20px] font-bold text-mint">
            {owed > 0 ? "+" : ""}{formatPaise(owed)}
          </p>
        </div>
        <div className="rounded-[13px] border border-coral/12 bg-surface px-4 py-3">
          <p className="mb-0.5 text-[10.5px] text-muted">Total you owe</p>
          <p className="font-display text-[20px] font-bold text-coral">
            {owe > 0 ? "−" : ""}{formatPaise(owe)}
          </p>
        </div>
        <div className="hidden rounded-[13px] border border-white/6 bg-surface px-4 py-3 sm:block">
          <p className="mb-0.5 text-[10.5px] text-muted">Net balance</p>
          <p className={`font-display text-[20px] font-bold ${overall > 0 ? "text-mint" : overall < 0 ? "text-coral" : "text-hi"}`}>
            {overall > 0 ? "+" : overall < 0 ? "−" : ""}{formatPaise(Math.abs(overall))}
          </p>
        </div>
      </div>

      {/* tab navigation */}
      <DashboardTabs tabs={DASHBOARD_TABS} activeTab={activeTab} />

      {/* tab content */}
      <div className="mt-2">
        {activeTab === "groups" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-hi">Groups</h2>
                <p className="text-sm text-dim">Shared expenses with friends, flatmates or trips.</p>
              </div>
              <div className="w-full sm:w-64">
                <CreateGroupForm />
              </div>
            </div>

            {standardGroups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
                <span className="text-3xl" role="img" aria-label="empty">🪹</span>
                <p className="font-medium text-strong">No groups yet</p>
                <p className="text-sm text-dim">
                  Create a group for your trip, flat, or crew — then add an expense.
                </p>
              </div>
            ) : (
              <FilteredGroupsList
                groups={standardGroups}
                userId={user.uid}
                customCategories={customCategories}
              />
            )}
          </div>
        )}

        {activeTab === "people" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-hi">People</h2>
                <p className="text-sm text-dim">Direct 1:1 splits and cash or UPI settlements.</p>
              </div>
              <div className="w-full sm:w-64">
                <CreateDirectRelationshipForm />
              </div>
            </div>

            {directGroups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
                <span className="text-3xl" role="img" aria-label="person">👤</span>
                <p className="font-medium text-strong">No people yet</p>
                <p className="text-sm text-dim">
                  Add someone to track 1:1 expenses, cash, and UPI settlements.
                </p>
              </div>
            ) : (
              <FilteredPeopleList
                people={directGroups}
                userId={user.uid}
                customCategories={customCategories}
              />
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-hi">Recent Activity</h2>
              <p className="text-sm text-dim">Latest transactions across all your groups.</p>
            </div>

            {activity.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
                <span className="text-3xl" role="img" aria-label="activity">📉</span>
                <p className="font-medium text-strong">No activity yet</p>
                <p className="text-sm text-dim">
                  Expenses and settlements you or your friends add will show up here.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {activity.map((item) => {
                  const isExpense = item.type === "expense";
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card p-4 transition-colors hover:bg-elevated"
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${
                          isExpense ? "bg-accent/10 text-accent" : "bg-mint/10 text-mint"
                        }`}
                        role="img"
                        aria-hidden
                      >
                        {isExpense ? "🧾" : "💸"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-hi truncate">
                            {isExpense ? item.title : "Settle up"}
                          </span>
                          <span className={`font-display text-sm font-semibold ${isExpense ? "text-hi" : "text-mint"}`}>
                            {formatPaise(item.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-dim mt-0.5">
                          <span>
                            in{" "}
                            <Link href={`/groups/${item.groupId}`} className="text-strong hover:underline">
                              {item.groupName}
                            </Link>
                          </span>
                          <span>{relativeTime(item.createdAt)}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

