"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPaise } from "@/lib/money";
import { netPositionFromSettlements } from "@/lib/simplify-debts";
import { memberAvatar } from "@/lib/avatar";
import { PREDEFINED_RELATIONSHIP_CATEGORIES } from "@/lib/relationship-categories";
import type { Group, RelationshipCategory } from "@/types";

interface Props {
  groups: Group[];
  userId: string;
  customCategories: RelationshipCategory[];
}

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

export function FilteredGroupsList({ groups, userId, customCategories }: Props) {
  const [selectedCatId, setSelectedCatId] = useState<string>("all");

  // Get active categories in the group list
  const activeCategoryIds = new Set(groups.map((g) => g.categoryId).filter(Boolean));
  
  const applicablePredefined = PREDEFINED_RELATIONSHIP_CATEGORIES.filter(
    (c) => (c.appliesTo === "both" || c.appliesTo === "group") && activeCategoryIds.has(c.id)
  );
  
  const applicableCustom = customCategories.filter(
    (c) => (c.appliesTo === "both" || c.appliesTo === "group") && activeCategoryIds.has(c.id)
  );

  const filteredGroups = selectedCatId === "all"
    ? groups
    : groups.filter((g) => g.categoryId === selectedCatId);

  return (
    <div className="flex flex-col gap-4">
      {/* Category Filter Chips */}
      {(applicablePredefined.length > 0 || applicableCustom.length > 0) && (
        <div className="flex flex-wrap gap-1.5 py-1">
          <button
            type="button"
            onClick={() => setSelectedCatId("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              selectedCatId === "all" ? "bg-accent text-white" : "border border-white/8 bg-card text-muted hover:text-hi"
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
                selectedCatId === c.id ? "bg-accent text-white" : "border border-white/8 bg-card text-muted hover:text-hi"
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
                selectedCatId === c.id ? "bg-accent text-white" : "border border-white/8 bg-card text-muted hover:text-hi"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-dim text-sm">
          No groups matching this category.
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredGroups.map((group) => {
            const net = netPositionFromSettlements(group.simplifiedDebts, userId);
            const tile = tileFor(group.id);
            const activeCategory =
              PREDEFINED_RELATIONSHIP_CATEGORIES.find((c) => c.id === group.categoryId) ||
              customCategories.find((c) => c.id === group.categoryId);

            return (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.id}`}
                  className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-card p-4 transition-all hover:bg-elevated hover:border-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent h-full"
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${tile.tile}`}
                    role="img"
                    aria-hidden
                  >
                    {tile.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-hi">
                      {group.name}
                    </span>
                    <span className="text-[13px] text-dim flex flex-wrap items-center gap-1">
                      <span>{group.members.length} {group.members.length === 1 ? "member" : "members"}</span>
                      {activeCategory && (
                        <span className="text-accent text-[11px] font-semibold bg-accent/10 px-1.5 py-0.5 rounded">
                          {activeCategory.icon} {activeCategory.name}
                        </span>
                      )}
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
