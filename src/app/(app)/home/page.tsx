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
import { HomeActions } from "@/components/HomeActions";
import { InstallBanner } from "@/components/InstallBanner";

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

  // Group balances for horizontal chips
  const groupBalances = allGroups
    .map((g) => ({
      id: g.id,
      name: g.name,
      net: netPositionFromSettlements(g.simplifiedDebts, user.uid),
    }))
    .filter((g) => g.net !== 0)
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  const firstName = (user.name ?? profile?.displayName ?? "there").split(" ")[0];
  const initial = (user.name ?? profile?.displayName ?? "Y").charAt(0).toUpperCase();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const isPaid = profile?.tier === "paid";

  return (
    <div className="flex flex-col gap-6">
      {/* Header: greeting + avatar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13.5px] font-medium text-dim">
            {greeting} 👋
          </p>
          <h1 className="font-display text-[24px] font-bold tracking-tight text-hi">
            {firstName}
          </h1>
        </div>
        <Link
          href="/settings"
          aria-label="Profile & settings"
          className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-accent font-display text-base font-bold text-white transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            isPaid ? "shadow-[0_0_0_2.5px_rgba(139,123,255,.4)]" : ""
          }`}
        >
          {initial}
        </Link>
      </div>

      {/* PWA Install Banner */}
      <InstallBanner />

      {/* Net balance hero card */}
      <div
        className={`flex flex-col rounded-[22px] border px-5 py-5 ${
          overall < 0
            ? "border-coral/15 bg-coral/5"
            : overall > 0
            ? "border-mint/15 bg-mint/5"
            : "border-white/8 bg-surface"
        }`}
      >
        <p className="mb-1 text-[11.5px] font-medium text-muted uppercase tracking-[0.04em]">Net position</p>
        <p
          className={`font-display text-[42px] font-extrabold leading-none tracking-tight ${
            overall < 0 ? "text-coral" : overall > 0 ? "text-mint" : "text-hi"
          }`}
        >
          {overall > 0 ? "+" : overall < 0 ? "−" : ""}
          {formatPaise(Math.abs(overall))}
        </p>
        {(owed > 0 || owe > 0) && (
          <p className="mt-2 flex items-center gap-2 text-[12.5px] font-medium text-dim">
            {owe > 0 && <span className="text-coral-soft">you owe {formatPaise(owe)}</span>}
            {owe > 0 && owed > 0 && <span className="text-white/10">•</span>}
            {owed > 0 && <span className="text-mint-soft">owed to you {formatPaise(owed)}</span>}
          </p>
        )}
        {overall === 0 && owed === 0 && owe === 0 && (
          <p className="mt-2 text-[12.5px] font-medium text-dim">all settled up 🎉</p>
        )}

        {/* Primary CTA */}
        <HomeActions
          owe={owe}
          debts={allGroups
            .map((g) => ({
              id: g.id,
              name: g.name,
              amount: Math.abs(Math.min(0, netPositionFromSettlements(g.simplifiedDebts, user.uid))),
            }))
            .filter((d) => d.amount > 0)}
        />
      </div>

      {/* Per-group balance chips */}
      {groupBalances.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[13.5px] font-bold text-hi">Your balances</span>
            <Link
              href="/groups"
              className="text-[12px] font-semibold text-accent transition-colors hover:text-accent-hover"
            >
              See all
            </Link>
          </div>
          {/* Horizontal scroll container breaking out of padding for full-bleed scroll */}
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 pt-1 snap-x scrollbar-hide">
            {groupBalances.map((gb) => (
              <Link
                key={gb.id}
                href={`/groups/${gb.id}?tab=balances`}
                className="flex min-w-[140px] max-w-[200px] shrink-0 snap-start flex-col gap-1 rounded-[16px] border border-white/8 bg-card p-3.5 transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="truncate text-[13px] font-semibold text-strong">{gb.name}</span>
                <span className={`font-display text-[16px] font-bold ${gb.net > 0 ? "text-mint" : "text-coral"}`}>
                  {gb.net > 0 ? "+" : "−"}{formatPaise(Math.abs(gb.net))}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-bold text-hi">
            Recent activity
          </span>
          <Link
            href="/groups"
            className="text-[12px] font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            All
          </Link>
        </div>

        {activity.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-white/10 px-6 py-12 text-center">
            <span className="text-[32px]" role="img" aria-label="empty">
              🪹
            </span>
            <p className="mt-1 text-[14px] font-semibold text-strong">No activity yet</p>
            <p className="text-[13px] text-dim">
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
                  className="flex items-start gap-3 border-b border-white/5 py-3 last:border-0"
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] font-display text-[15px] font-bold ${
                      isExpense ? "bg-accent/15 text-accent" : "bg-mint/15 text-mint"
                    }`}
                    role="img"
                    aria-hidden
                  >
                    {isExpense ? "🧾" : "💸"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-[1.4] text-strong">
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
                    <div className="mt-1 flex items-center justify-between">
                      <Link
                        href={`/groups/${item.groupId}`}
                        className="truncate text-[11.5px] text-faint transition-colors hover:text-accent"
                      >
                        {item.groupName}
                      </Link>
                      <span className="shrink-0 text-[10.5px] font-medium text-faint">
                        {relativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  {isExpense && (
                    <span className="shrink-0 font-display text-[14px] font-bold text-hi">
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

