import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { fetchDirectGroups } from "@/lib/read-model";
import { formatPaise } from "@/lib/money";
import { netPositionFromSettlements } from "@/lib/simplify-debts";
import { memberAvatar } from "@/lib/avatar";
import { CreateDirectRelationshipForm } from "@/components/CreateDirectRelationshipForm";

export const metadata: Metadata = { title: "People - Owely" };

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

export default async function PeoplePage() {
  const user = await requireSession();
  const people = await fetchDirectGroups(user.uid);
  const nets = people.map((person) => netPositionFromSettlements(person.simplifiedDebts, user.uid));
  const owed = nets.reduce((a, b) => (b > 0 ? a + b : a), 0);
  const owe = nets.reduce((a, b) => (b < 0 ? a - b : a), 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-dim">1:1 expenses</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-hi">
          People
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-mint/10 px-3 py-3">
          <span className="text-xs text-mint-soft">You&apos;re owed</span>
          <div className="mt-1 font-display text-xl font-semibold text-mint">
            {formatPaise(owed)}
          </div>
        </div>
        <div className="rounded-2xl bg-coral/10 px-3 py-3">
          <span className="text-xs text-coral-soft">You owe</span>
          <div className="mt-1 font-display text-xl font-semibold text-coral">
            {formatPaise(owe)}
          </div>
        </div>
      </div>

      <CreateDirectRelationshipForm />

      {people.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
          <span className="text-3xl" role="img" aria-label="person">👤</span>
          <p className="font-medium text-strong">No people yet</p>
          <p className="text-sm text-dim">
            Add someone to track 1:1 expenses, cash, and UPI settlements.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {people.map((person, i) => {
            const peerUid = person.directPeerUids?.[user.uid] ?? person.members.find((m) => m !== user.uid) ?? user.uid;
            const peer = person.memberDetails[peerUid];
            const name = peer?.name ?? "Someone";
            const net = nets[i];
            const avatar = memberAvatar(peerUid);
            return (
              <li key={person.id}>
                <Link
                  href={`/groups/${person.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card p-3.5 transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full font-display text-base font-semibold ${avatar.bg} ${avatar.fg}`}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-hi">{name}</span>
                    <span className="text-[13px] text-dim">
                      1:1 ledger{relativeTime(person.updatedAt) && ` · ${relativeTime(person.updatedAt)}`}
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
    return <span className="shrink-0 text-[13px] font-semibold text-mint">settled</span>;
  }
  const owed = net > 0;
  return (
    <span className="shrink-0 text-right">
      <span className={`block text-[11px] ${owed ? "text-mint-soft" : "text-coral-soft"}`}>
        {owed ? "owes you" : "you owe"}
      </span>
      <span className={`font-display text-[15px] font-semibold ${owed ? "text-mint" : "text-coral"}`}>
        {formatPaise(Math.abs(net))}
      </span>
    </span>
  );
}
