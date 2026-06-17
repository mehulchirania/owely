"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPaise } from "@/lib/money";
import { netPositionFromSettlements } from "@/lib/simplify-debts";
import { memberAvatar } from "@/lib/avatar";
import { PREDEFINED_RELATIONSHIP_CATEGORIES } from "@/lib/relationship-categories";
import type { Group, RelationshipCategory } from "@/types";

interface Props {
  people: Group[];
  userId: string;
  customCategories: RelationshipCategory[];
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

export function FilteredPeopleList({ people, userId, customCategories }: Props) {
  const [selectedCatId, setSelectedCatId] = useState<string>("all");

  // Get active categories in the people list
  const activeCategoryIds = new Set(people.map((p) => p.categoryId).filter(Boolean));
  
  const applicablePredefined = PREDEFINED_RELATIONSHIP_CATEGORIES.filter(
    (c) => (c.appliesTo === "both" || c.appliesTo === "direct") && activeCategoryIds.has(c.id)
  );
  
  const applicableCustom = customCategories.filter(
    (c) => (c.appliesTo === "both" || c.appliesTo === "direct") && activeCategoryIds.has(c.id)
  );

  const filteredPeople = selectedCatId === "all"
    ? people
    : people.filter((p) => p.categoryId === selectedCatId);

  return (
    <div className="flex flex-col gap-4">
      {/* Category Filter Chips */}
      {(applicablePredefined.length > 0 || applicableCustom.length > 0) && (
        <div className="flex flex-wrap gap-1.5 py-1">
          <button
            type="button"
            onClick={() => setSelectedCatId("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              selectedCatId === "all" ? "bg-accent text-ink" : "border border-white/8 bg-card text-muted hover:text-ink"
            }`}
          >
            All
          </button>
          {applicablePredefined.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCatId(c.id)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedCatId === c.id ? "bg-accent text-ink" : "border border-white/8 bg-card text-muted hover:text-ink"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
          {applicableCustom.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCatId(c.id)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedCatId === c.id ? "bg-accent text-ink" : "border border-white/8 bg-card text-muted hover:text-ink"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {filteredPeople.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-dim text-sm">
          No people matching this category.
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPeople.map((person) => {
            const peerUid = person.directPeerUids?.[userId] ?? person.members.find((m) => m !== userId) ?? userId;
            const peer = person.memberDetails[peerUid];
            const name = peer?.name ?? "Someone";
            const net = netPositionFromSettlements(person.simplifiedDebts, userId);
            const avatar = memberAvatar(peerUid);
            const activeCategory =
              PREDEFINED_RELATIONSHIP_CATEGORIES.find((c) => c.id === person.categoryId) ||
              customCategories.find((c) => c.id === person.categoryId);

            return (
              <li key={person.id}>
                <Link
                  href={`/groups/${person.id}`}
                  className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-card p-4 transition-all hover:bg-elevated hover:border-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent h-full"
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-base font-semibold ${avatar.bg} ${avatar.fg}`}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-hi">{name}</span>
                    <span className="text-[13px] text-dim flex flex-wrap items-center gap-1">
                      <span>1:1 ledger</span>
                      {activeCategory && (
                        <span className="text-accent text-[11px] font-semibold bg-accent/10 px-1.5 py-0.5 rounded">
                          {activeCategory.icon} {activeCategory.name}
                        </span>
                      )}
                      {relativeTime(person.updatedAt) && ` · ${relativeTime(person.updatedAt)}`}
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
