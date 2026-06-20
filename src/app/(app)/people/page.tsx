import Link from "next/link";
import type { Metadata } from "next";
import { requireSession } from "@/features/auth/session";
import { fetchDirectGroups, fetchStandardGroups } from "@/features/groups/queries";
import { formatPaise } from "@/lib/money";
import { netPositionFromSettlements } from "@/lib/simplify-debts";
import { memberAvatar } from "@/lib/avatar";
import { CreateDirectRelationshipForm } from "@/components/CreateDirectRelationshipForm";
import type { Group } from "@/types";

export const metadata: Metadata = { title: "People — Owely" };

export default async function PeoplePage() {
  const user = await requireSession();
  const [directGroups, standardGroups] = await Promise.all([
    fetchDirectGroups(user.uid),
    fetchStandardGroups(user.uid),
  ]);

  // Build cross-group contact map: uid → { name, sharedGroups, net }
  type Contact = {
    uid: string;
    name: string;
    sharedGroups: string[];
    net: number;
    avatarBg: string;
    avatarFg: string;
    directGroupId?: string;
  };

  const contactMap = new Map<string, Contact>();

  function addFromGroup(g: Group, isDirect: boolean) {
    for (const uid of g.members) {
      if (uid === user.uid) continue;
      const name = g.memberDetails[uid]?.name ?? "Someone";
      const existing = contactMap.get(uid);
      const av = memberAvatar(uid);
      const groupNet = netPositionFromSettlements(g.simplifiedDebts, user.uid);

      if (existing) {
        existing.sharedGroups.push(g.name);
        existing.net += groupNet;
        if (isDirect && !existing.directGroupId) existing.directGroupId = g.id;
      } else {
        contactMap.set(uid, {
          uid,
          name,
          sharedGroups: [g.name],
          net: groupNet,
          avatarBg: av.bg,
          avatarFg: av.fg,
          directGroupId: isDirect ? g.id : undefined,
        });
      }
    }
  }

  for (const g of directGroups) addFromGroup(g, true);
  for (const g of standardGroups) addFromGroup(g, false);

  const contacts = Array.from(contactMap.values()).sort((a, b) => {
    // Sort by absolute balance desc, then name
    const diff = Math.abs(b.net) - Math.abs(a.net);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  const owed = contacts.reduce((s, c) => (c.net > 0 ? s + c.net : s), 0);
  const owe = contacts.reduce((s, c) => (c.net < 0 ? s - c.net : s), 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-hi">
          People
        </h1>
        <CreateDirectRelationshipForm />
      </div>

      {/* Balance strip */}
      {(owed > 0 || owe > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[14px] border border-mint/14 bg-mint/6 px-4 py-3">
            <p className="mb-0.5 text-[10.5px] text-mint-soft">Owed to you</p>
            <p className="font-display text-[20px] font-bold text-mint">
              +{formatPaise(owed)}
            </p>
          </div>
          <div className="rounded-[14px] border border-coral/12 bg-coral/6 px-4 py-3">
            <p className="mb-0.5 text-[10.5px] text-coral-soft">You owe</p>
            <p className="font-display text-[20px] font-bold text-coral">
              −{formatPaise(owe)}
            </p>
          </div>
        </div>
      )}

      {/* Contacts list */}
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-white/10 px-6 py-12 text-center">
          <span className="text-3xl" role="img" aria-label="person">
            👤
          </span>
          <p className="font-medium text-strong">No people yet</p>
          <p className="text-[12.5px] text-dim">
            Add someone or join a group to see contacts here.
          </p>
          <div className="mt-2">
            <CreateDirectRelationshipForm />
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-[10px]">
          {contacts.map((c) => {
            const href = c.directGroupId
              ? `/groups/${c.directGroupId}`
              : `/groups?tab=people`;
            return (
              <li key={c.uid}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-[18px] border border-white/7 bg-card px-4 py-[13px] transition-all hover:border-white/12 hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {/* Avatar */}
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-base font-bold ${c.avatarBg} ${c.avatarFg}`}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </span>

                  {/* Name + groups */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-hi">
                      {c.name}
                    </p>
                    <p className="truncate text-[11px] text-dim">
                      {c.sharedGroups.slice(0, 2).join(", ")}
                      {c.sharedGroups.length > 2 &&
                        ` +${c.sharedGroups.length - 2} more`}
                    </p>
                  </div>

                  {/* Net balance */}
                  {c.net !== 0 ? (
                    <div className="shrink-0 text-right">
                      <p
                        className={`font-display text-[15px] font-semibold ${
                          c.net > 0 ? "text-mint" : "text-coral"
                        }`}
                      >
                        {c.net > 0 ? "+" : "−"}
                        {formatPaise(Math.abs(c.net))}
                      </p>
                      <p
                        className={`text-[10px] ${
                          c.net > 0 ? "text-mint-soft" : "text-coral-soft"
                        }`}
                      >
                        {c.net > 0 ? "owes you" : "you owe"}
                      </p>
                    </div>
                  ) : (
                    <span className="shrink-0 text-[12px] font-semibold text-mint">
                      settled
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
