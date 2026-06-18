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

const GROUP_TILES: { emoji: string; tile: string }[] = [
  { emoji: "🌴", tile: "bg-mint/15" },
  { emoji: "🏠", tile: "bg-accent/15" },
  { emoji: "🍱", tile: "bg-cat-yellow/15" },
  { emoji: "🎉", tile: "bg-cat-pink/15" },
  { emoji: "🧾", tile: "bg-accent2/15" },
  { emoji: "✈️", tile: "bg-accent2/15" },
];

function tileFor(id: string): { emoji: string; tile: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GROUP_TILES[h % GROUP_TILES.length];
}

export function FilteredGroupsList({ groups, userId, customCategories }: Props) {
  const [selectedCatId, setSelectedCatId] = useState<string>("all");

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
              selectedCatId === "all" ? "bg-accent text-ink" : "border border-white/8 bg-card text-muted hover:bg-elevated"
            }`}
          >
            All
          </button>
          {[...applicablePredefined, ...applicableCustom].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCatId(c.id)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedCatId === c.id ? "bg-accent text-ink" : "border border-white/8 bg-card text-muted hover:bg-elevated"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-dim">
          No groups matching this category.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => {
            const net = netPositionFromSettlements(group.simplifiedDebts, userId);
            const tile = tileFor(group.id);
            const activeCategory =
              PREDEFINED_RELATIONSHIP_CATEGORIES.find((c) => c.id === group.categoryId) ||
              customCategories.find((c) => c.id === group.categoryId);
            const visibleMembers = group.members.slice(0, 4);
            const extraCount = group.members.length - 4;

            return (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.id}`}
                  className="flex flex-col gap-2.5 rounded-[14px] border border-white/7 bg-card p-4 transition-all hover:border-white/12 hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {/* top row: icon + name + category badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-[17px] ${tile.tile}`}
                        role="img"
                        aria-hidden
                      >
                        {tile.emoji}
                      </span>
                      <div>
                        <p className="text-[13.5px] font-semibold text-hi leading-tight">{group.name}</p>
                        <p className="text-[10.5px] text-dim">{group.members.length} {group.members.length === 1 ? "member" : "members"}</p>
                      </div>
                    </div>
                    {activeCategory && (
                      <span className="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-[9.5px] font-semibold text-dim">
                        {activeCategory.name}
                      </span>
                    )}
                  </div>

                  {/* stacked member avatars */}
                  <div className="flex">
                    {visibleMembers.map((uid, i) => {
                      const a = memberAvatar(uid);
                      const name = group.memberDetails[uid]?.name ?? "?";
                      return (
                        <span
                          key={uid}
                          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-card font-display text-[8.5px] font-bold ${a.bg} ${a.fg} ${i > 0 ? "-ml-1.5" : ""}`}
                          style={{ position: "relative", zIndex: 4 - i }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </span>
                      );
                    })}
                    {extraCount > 0 && (
                      <span
                        className="-ml-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-card bg-elevated font-display text-[8px] font-semibold text-dim"
                        style={{ position: "relative", zIndex: 0 }}
                      >
                        +{extraCount}
                      </span>
                    )}
                  </div>

                  {/* balance */}
                  <div>
                    <p className={`font-display text-[18px] font-bold ${net > 0 ? "text-mint" : net < 0 ? "text-coral" : "text-dim"}`}>
                      {net > 0 ? "+" : net < 0 ? "−" : ""}
                      {formatPaise(Math.abs(net))}
                    </p>
                    <p className={`text-[10.5px] ${net > 0 ? "text-mint-soft" : net < 0 ? "text-coral-soft" : "text-faint"}`}>
                      {net > 0 ? "you're owed" : net < 0 ? "you owe" : "all settled"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
