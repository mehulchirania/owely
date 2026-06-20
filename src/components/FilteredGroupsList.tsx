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
  const [query, setQuery] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string>("all");

  const activeCategoryIds = new Set(groups.map((g) => g.categoryId).filter(Boolean));
  const applicablePredefined = PREDEFINED_RELATIONSHIP_CATEGORIES.filter(
    (c) => (c.appliesTo === "both" || c.appliesTo === "group") && activeCategoryIds.has(c.id)
  );
  const applicableCustom = customCategories.filter(
    (c) => (c.appliesTo === "both" || c.appliesTo === "group") && activeCategoryIds.has(c.id)
  );

  const filtered = groups.filter((g) => {
    const matchesSearch = query === "" || g.name.toLowerCase().includes(query.toLowerCase());
    const matchesCat = selectedCatId === "all" || g.categoryId === selectedCatId;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="flex h-10 items-center gap-2 rounded-[12px] border border-white/8 bg-card px-3">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-faint"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          placeholder="Search groups..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-[13px] text-hi placeholder:text-faint focus:outline-none"
        />
      </div>

      {/* Category filter chips */}
      {(applicablePredefined.length > 0 || applicableCustom.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCatId("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              selectedCatId === "all"
                ? "bg-accent text-ink"
                : "border border-white/8 bg-card text-muted hover:bg-elevated"
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
                selectedCatId === c.id
                  ? "bg-accent text-ink"
                  : "border border-white/8 bg-card text-muted hover:bg-elevated"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-white/10 px-6 py-10 text-center text-[12.5px] text-dim">
          No groups found.
        </div>
      ) : (
        <ul className="flex flex-col gap-[10px]">
          {filtered.map((group) => {
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
                  className="flex items-center gap-3 rounded-[18px] border border-white/7 bg-card px-[15px] py-[14px] transition-all hover:border-white/12 hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {/* Emoji tile */}
                  <span
                    className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px] text-[22px] ${tile.tile}`}
                    role="img"
                    aria-hidden
                  >
                    {tile.emoji}
                  </span>

                  {/* Name + members */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-semibold text-hi">
                        {group.name}
                      </span>
                      {activeCategory && (
                        <span className="shrink-0 rounded-full bg-elevated px-[6px] py-[1.5px] text-[9.5px] font-semibold text-dim">
                          {activeCategory.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex">
                        {visibleMembers.map((uid, i) => {
                          const a = memberAvatar(uid);
                          const name = group.memberDetails[uid]?.name ?? "?";
                          return (
                            <span
                              key={uid}
                              className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-card font-display text-[8px] font-bold ${a.bg} ${a.fg} ${i > 0 ? "-ml-1" : ""}`}
                              style={{ zIndex: 4 - i, position: "relative" }}
                            >
                              {name.charAt(0).toUpperCase()}
                            </span>
                          );
                        })}
                        {extraCount > 0 && (
                          <span
                            className="-ml-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-card bg-elevated font-display text-[7.5px] font-semibold text-dim"
                            style={{ zIndex: 0, position: "relative" }}
                          >
                            +{extraCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-dim">
                        {group.members.length}{" "}
                        {group.members.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="shrink-0 text-right">
                    <p
                      className={`font-display text-[16px] font-bold ${
                        net > 0 ? "text-mint" : net < 0 ? "text-coral" : "text-faint"
                      }`}
                    >
                      {net > 0 ? "+" : net < 0 ? "−" : ""}
                      {formatPaise(Math.abs(net))}
                    </p>
                    <p
                      className={`text-[10px] ${
                        net > 0 ? "text-mint-soft" : net < 0 ? "text-coral-soft" : "text-faint"
                      }`}
                    >
                      {net > 0 ? "owed to you" : net < 0 ? "you owe" : "settled"}
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
