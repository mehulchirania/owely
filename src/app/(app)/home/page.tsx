import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/features/auth/session";
import { fetchUser } from "@/features/auth/queries";
import {
  fetchStandardGroups,
  fetchDirectGroups,
  fetchUserActivity,
} from "@/features/groups/queries";
import { formatPaise } from "@/lib/money";
import { netPositionFromSettlements } from "@/lib/simplify-debts";
import { memberAvatar } from "@/lib/avatar";

export const metadata: Metadata = { title: "Home — Owely" };

function relativeTime(ms: number): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default async function HomePage() {
  const user = await requireSession();

  const [profile, standardGroups, directGroups, activity] = await Promise.all([
    fetchUser(user.uid),
    fetchStandardGroups(user.uid),
    fetchDirectGroups(user.uid),
    fetchUserActivity(user.uid, 12),
  ]);

  const allGroups = [...standardGroups, ...directGroups];
  const nets = allGroups.map((g) =>
    netPositionFromSettlements(g.simplifiedDebts, user.uid)
  );
  const overall = nets.reduce((a, b) => a + b, 0);
  const owed = nets.reduce((a, b) => (b > 0 ? a + b : a), 0);
  const owe = nets.reduce((a, b) => (b < 0 ? a - b : a), 0);

  // All debts where I owe someone, sorted by amount desc, top 3
  const debts = allGroups
    .flatMap((g) =>
      g.simplifiedDebts
        .filter((t) => t.from === user.uid)
        .map((t) => ({
          id: t.id,
          groupId: g.id,
          groupName: g.name,
          toUid: t.to,
          toName: g.memberDetails[t.to]?.name ?? "Someone",
          amount: t.amount,
        }))
    )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const firstName = (user.name ?? profile?.displayName ?? "there").split(" ")[0];
  const initial = (user.name ?? profile?.displayName ?? "Y").charAt(0).toUpperCase();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const isPaid = profile?.tier === "paid";

  return (
    <div className="flex flex-col gap-5">
      {/* Header: greeting + avatar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-dim">
            {greeting} 👋
          </p>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-hi">
            {firstName}
          </h1>
        </div>
        <Link
          href="/settings"
          aria-label="Profile & settings"
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-accent font-display text-base font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            isPaid ? "shadow-[0_0_0_2.5px_rgba(139,123,255,.4)]" : ""
          }`}
        >
          {initial}
        </Link>
      </div>

      {/* Net balance card */}
      <div
        className={`rounded-[18px] border px-4 py-[14px] ${
          overall < 0
            ? "border-coral/18 bg-coral/6"
            : overall > 0
            ? "border-mint/18 bg-mint/6"
            : "border-white/8 bg-surface"
        }`}
      >
        <p className="mb-1 text-[10.5px] text-muted">Net balance</p>
        <p
          className={`font-display text-[38px] font-bold leading-none ${
            overall < 0 ? "text-coral" : overall > 0 ? "text-mint" : "text-dim"
          }`}
        >
          {overall > 0 ? "+" : overall < 0 ? "−" : ""}
          {formatPaise(Math.abs(overall))}
        </p>
        {(owed > 0 || owe > 0) && (
          <p className="mt-1 text-[11.5px] text-muted">
            {owe > 0 && `you owe ${formatPaise(owe)}`}
            {owe > 0 && owed > 0 && " · "}
            {owed > 0 && `owed to you ${formatPaise(owed)}`}
          </p>
        )}
        {overall === 0 && owed === 0 && owe === 0 && (
          <p className="mt-1 text-[11.5px] text-muted">all settled up 🎉</p>
        )}
      </div>

      {/* Settle up section */}
      {debts.length > 0 && (
        <div>
          <div className="mb-[10px] flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-hi">Settle up</span>
            <Link
              href="/groups"
              className="text-[11px] font-semibold text-accent"
            >
              See all
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {debts.map((debt) => {
              const av = memberAvatar(debt.toUid);
              return (
                <div
                  key={debt.id}
                  className="flex items-center gap-[10px] rounded-[14px] border border-white/7 bg-card px-[13px] py-[11px]"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold ${av.bg} ${av.fg}`}
                  >
                    {debt.toName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-hi">
                      {debt.toName}
                    </p>
                    <p className="text-[10.5px] text-dim">{debt.groupName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="mb-1 font-display text-[14px] font-bold text-coral">
                      {formatPaise(debt.amount)}
                    </p>
                    <Link
                      href={`/groups/${debt.groupId}?tab=balances`}
                      className="flex h-[26px] items-center rounded-[7px] bg-accent px-[10px] text-[10.5px] font-bold text-white shadow-[0_4px_12px_-4px_rgba(139,123,255,.6)]"
                    >
                      Settle
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <div className="mb-[10px] flex items-center justify-between">
          <span className="text-[12.5px] font-bold text-hi">
            Recent activity
          </span>
          <Link
            href="/groups"
            className="text-[11px] font-semibold text-accent"
          >
            All
          </Link>
        </div>

        {activity.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-white/10 px-6 py-10 text-center">
            <span className="text-3xl" role="img" aria-label="empty">
              🪹
            </span>
            <p className="text-sm font-medium text-strong">No activity yet</p>
            <p className="text-[12.5px] text-dim">
              Add an expense to get started.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {activity.map((item) => {
              const isExpense = item.type === "expense";
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-[10px] border-b border-white/4 py-[10px] last:border-0"
                >
                  <span
                    className={`mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${
                      isExpense ? "bg-accent/15 text-accent" : "bg-mint/15 text-mint"
                    }`}
                    role="img"
                    aria-hidden
                  >
                    {isExpense ? "🧾" : "💸"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug text-strong">
                      {isExpense ? (
                        <>
                          <span className="font-semibold text-hi">
                            {item.groupName}
                          </span>{" "}
                          expense added
                        </>
                      ) : (
                        <>
                          Settled{" "}
                          <span className="font-semibold text-mint">
                            {formatPaise(item.amount)}
                          </span>
                        </>
                      )}
                    </p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <Link
                        href={`/groups/${item.groupId}`}
                        className="text-[10.5px] text-faint hover:text-accent"
                      >
                        {item.groupName}
                      </Link>
                      <span className="text-[10px] text-faint">
                        {relativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  {isExpense && (
                    <span className="shrink-0 font-display text-[13px] font-semibold text-hi">
                      {formatPaise(item.amount)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
