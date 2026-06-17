import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { fetchStandardGroups } from "@/lib/read-model";
import { formatPaise } from "@/lib/money";
import { netPositionFromSettlements } from "@/lib/simplify-debts";
import { CreateGroupForm } from "@/components/CreateGroupForm";

export const metadata: Metadata = { title: "Your groups — Owely" };

/** Deterministic color-forward tile per group (emoji + tint), keyed by id. */
const GROUP_TILES = [
  { emoji: "🌴", tile: "bg-mint/15" },
  { emoji: "🏠", tile: "bg-accent/15" },
  { emoji: "🍱", tile: "bg-cat-yellow/15" },
  { emoji: "🎉", tile: "bg-cat-pink/15" },
  { emoji: "🧾", tile: "bg-cat-cyan/15" },
  { emoji: "✈️", tile: "bg-accent2/15" },
] as const;

function tileFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GROUP_TILES[h % GROUP_TILES.length];
}

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

export default async function GroupsPage() {
  const user = await requireSession();
  const groups = await fetchStandardGroups(user.uid);

  const nets = groups.map((g) => netPositionFromSettlements(g.simplifiedDebts, user.uid));
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
      {/* greeting */}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-dim">{today}</span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-hi">
          Hey, {firstName} 👋
        </h1>
      </div>

      {/* net balance hero */}
      <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-card p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-8 h-36 w-36 rounded-full bg-accent opacity-20 blur-[60px]"
        />
        <span className="text-[13px] text-muted">Your net balance</span>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span
            className={`font-display text-[38px] font-bold tracking-tight ${
              overall > 0 ? "text-mint" : overall < 0 ? "text-coral" : "text-hi"
            }`}
          >
            {overall > 0 ? "+" : overall < 0 ? "−" : ""}
            {formatPaise(Math.abs(overall))}
          </span>
          <span className="text-[13px] text-dim">overall</span>
        </div>
        <div className="mt-4 flex gap-2.5">
          <div className="flex-1 rounded-2xl bg-mint/10 px-3 py-2.5">
            <span className="text-xs text-mint-soft">You&apos;re owed</span>
            <div className="mt-0.5 font-display text-[17px] font-semibold text-mint">
              {formatPaise(owed)}
            </div>
          </div>
          <div className="flex-1 rounded-2xl bg-coral/10 px-3 py-2.5">
            <span className="text-xs text-coral-soft">You owe</span>
            <div className="mt-0.5 font-display text-[17px] font-semibold text-coral">
              {formatPaise(owe)}
            </div>
          </div>
        </div>
      </div>

      {/* groups header */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="font-display text-[15px] font-semibold text-hi">
          Your groups
        </h2>
      </div>

      <CreateGroupForm />

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
          <span className="text-3xl" role="img" aria-label="empty">🪹</span>
          <p className="font-medium text-strong">No groups yet</p>
          <p className="text-sm text-dim">
            Create a group for your trip, flat, or crew — then add an expense.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {groups.map((group, i) => {
            const net = nets[i];
            const tile = tileFor(group.id);
            return (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card p-3.5 transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${tile.tile}`}
                    role="img"
                    aria-hidden
                  >
                    {tile.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-hi">
                      {group.name}
                    </span>
                    <span className="text-[13px] text-dim">
                      {group.members.length}{" "}
                      {group.members.length === 1 ? "member" : "members"}
                      {relativeTime(group.updatedAt) && ` · ${relativeTime(group.updatedAt)}`}
                    </span>
                  </span>
                  <NetPill net={net} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NetPill({ net }: { net: number }) {
  if (net === 0) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-mint">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
        settled
      </span>
    );
  }
  const owed = net > 0;
  return (
    <span className="shrink-0 text-right">
      <span className={`block text-[11px] ${owed ? "text-mint-soft" : "text-coral-soft"}`}>
        {owed ? "you're owed" : "you owe"}
      </span>
      <span className={`font-display text-[15px] font-semibold ${owed ? "text-mint" : "text-coral"}`}>
        {formatPaise(Math.abs(net))}
      </span>
    </span>
  );
}
